/* eslint camelcase: ["off"] */

let ArrayType;
let primitives;
const inherit = require('raptor-util/inherit');
let Model;

function _emptyObject () {
  return Object.create(null);
}

const NOT_INSTANCE = {};
const EMPTY_PROPERTIES = _emptyObject();

function _forProperty (property, options, work) {
  options = _toOptions(options);
  const origProperty = options.property;
  options.property = property;
  work(options);
  options.property = origProperty;
  return options;
}

function _notifySet (model, oldValue, newValue, property) {
  const Type = model.constructor;
  if (Type._onSet) {
    const event = {
      model: model,
      propertyName: property.getName(),
      oldValue: oldValue,
      newValue: newValue,
      property: property
    };

    const len = Type._onSet.length;
    for (let i = 0; i < len; i++) {
      Type._onSet[i](model, event);
    }
  }
}

function _set (model, data, property, value, options) {
  const Type = property.getType();

  // this the value that we return (it may be the result of wrapping/coercing the original value)
  const wrapped = Type.isWrapped();

  if (Model.isModel(value) && Type.isInstance(value)) {
    // value is expected type
    // store raw data in this model's data
  } else if (!wrapped && Type.coerce) {
    // Only call coerce if this type is not wrapped
    // (otherwise we'd call coerce twice which is wasteful)

    // The coerce function needs some context in the options
    options = _forProperty(property, options, function (options) {
      value = Type.coerce(value, options);
    });
  }

  const propertyKey = property.getKey();
  const oldValue = data[propertyKey];

  const setter = property.getSetter();
  if (setter) {
    // setter will do all of the work
    setter.call(model, value, property);

    // get the new value
    value = data[propertyKey];
  }

  if (wrapped) {
    options = _forProperty(property, options, function (options) {
      // recursively call setters
      // The return value is the wrapped value
      value = Type.wrap(value, options);
    });
  }

  if (oldValue !== value) {
    data[propertyKey] = value;
    _notifySet(model, oldValue, value, property);
  }

  return value;
}

function _generateGetter (property) {
  const propertyKey = property.getKey();
  const getter = property.getGetter();
  if (getter) {
    return function (options) {
      return getter.call(this, property);
    };
  } else {
    return function (options) {
      return this.data[propertyKey];
    };
  }
}

function _generateSetter (property) {
  return function (value, options) {
    return _set(this, this.data, property, value, options);
  };
}

// This function will be used to make sure an array value
// exists for the given property
function _ensureArray (model, property) {
  const propertyKey = property.getKey();
  let array = model.data[propertyKey];
  if (!array) {
    model.data[propertyKey] = array = [];
    ArrayType.flagAsArrayType(array);
  }

  return array;
}

function _generateAddValueTo (property) {
  const items = property.items;
  const ItemType = items && items.type;
  let coerce;

  if (ItemType) {
    coerce = ItemType.coerce;
  }

  if (ItemType && ItemType.isWrapped()) {
    // the addTo<Property> function will need to wrap each item
    // when adding it to the array
    return function (value, options) {
      const array = _ensureArray(this, property);
      array.push(ItemType.wrap(value, options));
    };
  } else {
    // the addTo<Property> function should add raw value to array
    // (call the type coercion function if it exists)
    return function (value, options) {
      const array = _ensureArray(this, property);
      array.push((coerce) ? coerce.call(ItemType, value, options) : value);
    };
  }
}

function _initialUpperCase (str) {
  return str.charAt(0).toUpperCase() + str.substring(1);
}

function _convertArray (array, options) {
  return ArrayType.convertArrayItems(array, this, options);
}

// This is the constructor that gets called when ever a Model (or derived type)
// is created
module.exports = Model = function Model (rawData, options) {
  const Type = this.constructor;

  if (Type.constructable === false) {
    throw new Error('Instances of this type cannot be created. data: ' + rawData);
  }
};

Model.typeName = 'Model';

// This is a internal helper function that will do some work in the context
// of a property. The options.property value will be temporarily updated to
// reflect the given property and then options.property will be restored
// to its original value after the work is executed.
Model._forProperty = _forProperty;

Model.isModel = function (obj) {
  return obj && obj.Model;
};

Model.cleanArray = function (array, options) {
  let i = array.length;
  const newArray = new Array(i);
  while (--i >= 0) {
    newArray[i] = Model.clean(array[i], options);
  }
  return newArray;
};

Model.clean = function (obj, options) {
  options = _toOptions(options);

  if (obj == null) {
    return obj;
  } else if (Array.isArray(obj)) {
    return Model.cleanArray(obj, options);
  } else if (obj.Model) {
    // obj is an instance of a Model
    return obj.clean(options);
  } else {
    // obj is not associated with a model instance...

    // If the obj we were given is a complex object then return a
    // deep clone...
    // NOTE: Don't clone Date object to clean it since we assume it
    // is already clean.
    if ((obj.constructor !== Date) && (typeof obj === 'object')) {
      const clean = {};
      const keys = Object.keys(obj);
      const len = keys.length;
      for (let i = 0; i < len; i++) {
        const key = keys[i];
        const value = Model.clean(obj[key], options);
        if (value !== undefined) {
          clean[key] = value;
        }
      }
      return clean;
    } else {
      return obj;
    }
  }
};

Model.unwrap = function (obj) {
  if (obj == null) {
    return obj;
  }

  if (obj.Model) {
    return obj.data || obj;
  } else {
    return obj;
  }
};

Model.hasProperties = function () {
  return (this.properties !== EMPTY_PROPERTIES) || (this.additionalProperties === true);
};

Model.hasProperty = function (propertyName) {
  return !!this.properties[propertyName];
};

Model.getProperties = function () {
  return this.properties;
};

Model.getProperty = function (propertyName) {
  return this.properties[propertyName];
};

Model.forEachProperty = function (options, callback) {
  if (!this.Properties) {
    return;
  }

  if (arguments.length === 1) {
    callback = arguments[0];
    options = _emptyObject();
  }

  let proto = this.Properties.prototype;
  const inherited = (options.inherited !== false);

  const seen = _emptyObject();
  do {
    for (let key in proto) {
      // Make sure we haven't already handled the given property
      if (!seen[key] && proto.hasOwnProperty(key)) {
        const property = proto[key];
        if (property.constructor === Property) {
          if (key === property.getName()) {
            callback(property);
          }
        }
        seen[key] = true;
      }
    }

    if (!inherited) {
      break;
    }
    // Move up the prototype chain if we care about inherited properties
  } while (((proto = Object.getPrototypeOf(proto)) != null));
};

Model.preventConstruction = function () {
  this.constructable = false;
};

Model.isCompatibleWith = function (other) {
  let cur = this;
  do {
    if (cur === other) {
      return true;
    }
  } while ((cur = (cur.$super)));
  return false;
};

Model.isInstance = function (value) {
  return (value instanceof this);
};

Model.isPrimitive = function () {
  return false;
};

Model.coercionError = function (value, options, errorMessage) {
  let message = '';
  if (options && options.property && options.property.getName) {
    message += options.property.getName() + ': ';
  }
  message += 'Invalid value: ' + value;

  if (errorMessage) {
    message += ' - ' + errorMessage;
  }

  if (options && options.errors) {
    options.errors.push(message);
  } else {
    const err = new Error(message);
    err.source = Model;
    throw err;
  }
};

Model.stringify = function (obj, pretty) {
  return JSON.stringify(Model.clean(obj), null, pretty ? '  ' : undefined);
};

const Model_proto = Model.prototype;

Model_proto.unwrap = function () {
  return this.data || this;
};

/**
 * Creates a deep clone of the data stored in this object with all temporary
 * and non-persisted values removed.
 */
Model_proto.clean = function (options) {
  options = _toOptions(options);

  const Type = this.Model;

  if (Type.clean) {
    // call "clean" function provided by type
    return Type.clean(this, options);
  }

  // The "properties" object is a map that we can use to lookup
  // all property definitions
  const properties = Type.properties;
  let data = this.data;

  if (Type.hasProperties()) {
    const clone = {};
    const keys = Object.keys(data);
    const len = keys.length;
    for (let i = 0; i < len; i++) {
      const key = keys[i];
      const property = options.property = properties[key];
      let value = data[key];
      if (property && (property.isPersisted())) {
        // no need to clean null/undefined values
        if (value == null) {
          if (value !== undefined) {
            clone[key] = value;
          }
        } else {
          const propertyType = property.type;
          const clean = propertyType.clean;
          const oldProperty = options.property;
          options.property = property;

          if (clean) {
            // call the clean function provided by model
            value = propertyType.clean(value, options);
          } else if (value.Model || propertyType.isWrapped()) {
            // value is a Model instance or it is something
            // that could be wrapped.
            // Use the default clean function...
            value = Model.clean(value, options);
          }

          // restore the old property
          options.property = oldProperty;

          if (value !== undefined) {
            // put the cleaned value into the clone
            clone[key] = value;
          }
        }
      } else if (Type.additionalProperties) {
        if (value.Model) {
          value = value.clean(options);
        }
        // simply copy the additional property
        if (value !== undefined) {
          clone[key] = value;
        }
      } else if (options.errors) {
        options.errors.push('Unrecognized property: ' + key);
      }
    }

    data = clone;
  }

  if (Type.afterClean) {
    const result = Type.afterClean(data, options);
    if (result !== undefined) {
      data = result;
    }
  }

  // Model does not have properties so simply return the raw data
  // (there should be no wrapper)
  return data;
};

function _getProperty (model, propertyName, errors) {
  const Type = model.constructor;
  const properties = Type.properties;
  const property = properties[propertyName];
  if (!property) {
    if (!Type.additionalProperties) {
      const err = new Error('Invalid property: ' + propertyName);
      if (errors) {
        errors.push(err);
      } else {
        throw err;
      }
    }
  }
  return property;
}

/**
 * Set value of property with given propertyName to given value.
 * @param {String} propertyName the property name
 * @param {Object} value the new value
 * @param {Object|Array} options an optional object that specifies options
 *    or an array which will have any errors added to it
 */
Model_proto.set = function (propertyName, value, options) {
  const modelData = this.data;
  const property = _getProperty(this, propertyName, options);
  if (property) {
    _set(this, modelData, property, value, options);
  } else {
    const oldValue = modelData[propertyName];
    if (oldValue !== value) {
      modelData[propertyName] = value;
      _notifySet(this, propertyName, oldValue, value);
    }
  }
};

/**
 * Get value of property with given propertyName.
 * @param {String} propertyName the property name
 * @param {Object|Array} options an optional object that specifies options
 *    or an array which will have any errors added to it
 */
Model_proto.get = function (propertyName, options) {
  const Type = this.constructor;
  const property = Type.properties[propertyName];
  if (property) {
    const getter = property.getGetter();
    if (getter) {
      return getter.call(this, propertyName, property);
    }
  }

  return this.data[propertyName];
};

Model_proto.stringify = function (pretty) {
  return Model.stringify(this.data, pretty);
};

function Property (config) {
  for (let key in config) {
    if (config.hasOwnProperty(key)) {
      this[key] = config[key];
    }
  }
}

const Property_proto = Property.prototype;

Property_proto.getName = function () {
  return this.name;
};

Property_proto.getKey = Property_proto.toString = function () {
  return this.key;
};

Property_proto.getType = function () {
  return this.type;
};

Property_proto.getItems = function () {
  return this.items;
};

Property_proto.getGetter = function () {
  return this.get;
};

Property_proto.getSetter = function () {
  return this.set;
};

Property_proto.isPersisted = function () {
  return (this.persist !== false);
};

function Items (owner) {
  this.owner = owner;
}

const Items_proto = Items.prototype;

Items_proto.getName = function () {
  return this.owner.getName();
};

function _parseType (type) {
  if (type.Model) {
    // type is derived from Model
    return type;
  }

  switch (type) {
    case Date:
      return primitives.date;
    case Number:
      return primitives.number;
    case Boolean:
      return primitives.boolean;
    case String:
      return primitives.string;
    case Object:
      return primitives.object;
    case Function:
      return primitives.function;
    case Array:
      return ArrayType;
  }

  return null;
}

function _parseTypeStr (typeStr, propertyConfig, resolver, Type) {
  const len = typeStr.length;
  if ((typeStr.charAt(len - 2) === '[') && (typeStr.charAt(len - 1) === ']')) {
    // array type
    propertyConfig.type = ArrayType;
    propertyConfig.items = _emptyObject();
    _parseTypeStr(typeStr.substring(0, len - 2), propertyConfig.items, resolver, Type);
  } else {
    propertyConfig.type = _resolve(typeStr, resolver, Type);
  }
}

function _resolve (typeName, resolver, Type) {
  let type = primitives[typeName];
  if (type) {
    return type;
  }

  if (typeName === 'self') {
    return Type;
  }

  if (resolver) {
    if ((type = resolver(typeName))) {
      return type;
    }
  }

  throw new Error('Invalid type: ' + typeName);
}

function _parseTypeConfig (propertyName, propertyConfig, resolver, Type) {
  if (Array.isArray(propertyConfig)) {
    propertyConfig = {
      type: propertyConfig
    };
  } else if ((typeof propertyConfig) !== 'object') {
    propertyConfig = {
      type: propertyConfig
    };
  }

  const type = propertyConfig.type;
  if (type) {
    if (Array.isArray(type)) {
      // handle short-hand notation for Array types
      propertyConfig.type = ArrayType;
      if (type.length) {
        const items = type[0];
        if (items != null) {
          propertyConfig.items = _parseTypeConfig(propertyName, items, resolver, Type);
        }
      }
    } else if (type.constructor === String) {
      _parseTypeStr(type, propertyConfig, resolver, Type);
    } else {
      // handle normal notation for types
      propertyConfig.type = _parseType(type);

      if (!propertyConfig.type) {
        throw new Error('Unrecognized type ' + JSON.stringify(type) + ' for property "' + propertyName + '". Expected type derived from Model or primitive type.');
      }

      // Convert the subtype to special type if necessary
      if (propertyConfig.items) {
        propertyConfig.items = _parseTypeConfig(propertyName, propertyConfig.items, resolver, Type);
      }
    }
  } else {
    propertyConfig.type = primitives.any;
  }

  return propertyConfig;
}

function _toProperty (name, propertyConfig, resolver, Type) {
  propertyConfig = _parseTypeConfig(name, propertyConfig, resolver, Type);
  propertyConfig.name = name;
  propertyConfig.key = propertyConfig.key || name;

  return new Property(propertyConfig);
}

const SPECIAL_PROPERTIES = {
  init: 1,
  wrap: 1,
  coerce: 1,
  properties: 1,
  prototype: 1,
  mixins: 1
};

function _copyNonSpecialPropertiesToType (config, Type) {
  for (let key in config) {
    if (config.hasOwnProperty(key) && !SPECIAL_PROPERTIES[key]) {
      Type[key] = config[key];
    }
  }
}

function _toOptions (options) {
  if (options == null) {
    return _emptyObject();
  }

  if (Array.isArray(options)) {
    return {
      errors: options
    };
  }

  return options;
}

function _addToArray (obj, propertyName, value) {
  if (!value) {
    return;
  }

  const arr = obj[propertyName] || (obj[propertyName] = []);
  arr.push(value);
}

function _concatToArray (obj, propertyName, otherArr) {
  if (!otherArr) {
    return;
  }

  const arr = obj[propertyName] || (obj[propertyName] = []);
  for (let i = 0; i < otherArr.length; i++) {
    arr.push(otherArr[i]);
  }
}

function _installMixin (mixin, Type, Base, existingProperties) {
  if (mixin.initType) {
    mixin.initType(Type);
  }

  let key;
  if (mixin.id) {
    key = '_mixin_' + mixin.id;

    if ((Base.properties && Base.properties[key]) || Type.Properties.prototype[key]) {
      // this mixin is already installed
      return;
    }

    Type.Properties.prototype[key] = true;
  }

  const mixinPrototype = mixin.prototype;
  if (mixinPrototype) {
    for (key in mixinPrototype) {
      if (mixinPrototype.hasOwnProperty(key)) {
        Type.prototype[key] = mixinPrototype[key];
      }
    }
  }

  let mixinProperties;
  if ((mixinProperties = mixin.properties)) {
    for (key in mixinProperties) {
      if (mixinProperties.hasOwnProperty(key) && (existingProperties[key] === undefined)) {
        existingProperties[key] = mixinProperties[key];
      }
    }
  }

  _addToArray(Type, '_init', mixin.init);
  _addToArray(Type, '_onSet', mixin.onSet);

  let mixins;
  if ((mixins = mixin.mixins)) {
    mixins.forEach(function (mixin) {
      _installMixin(mixin, Type, Base, existingProperties);
    });
  }
}

function _checkInstance (obj, wrap, Type) {
  return wrap && Type.isInstance(obj) ? obj : NOT_INSTANCE;
}

function _extend (Base, config, resolver) {
  config = config || _emptyObject();

  const init = config.init;
  let wrap = config.wrap;
  const coerce = config.coerce;
  let properties = config.properties;
  const prototype = config.prototype;
  const mixins = config.mixins;
  let Data;

  function Type (rawData, options) {
    if (Data) {
      if (this.data === undefined) {
        this.data = new Data(this, rawData, options);
      }
    } else {
      this.data = rawData;
    }

    // Call the super constructor
    Type.$super.call(this, rawData, options);

    // Call initialization functions provided by mixins (if any)
    const initArr = Type._init;
    if (initArr) {
      for (let i = 0; i < initArr.length; i++) {
        initArr[i].call(this, rawData, options);
      }
    }

    // Call the user-provided "constructor" function
    if (init) {
      init.call(this, rawData, options);
    }
  }

  // Selectively copy properties from Model to Type
  [
    'getProperty',
    'getProperties',
    'hasProperty',
    'hasProperties',
    'preventConstruction',
    'unwrap',
    'coercionError',
    'forEachProperty',
    'isCompatibleWith',
    'isInstance',
    'isPrimitive'
  ].forEach(function (property) {
    Type[property] = Model[property];
  });

  Type.convertArray = _convertArray;

  // Now copy any properties from config to Type that might
  // override any of the special prpoerties that were copied above
  _copyNonSpecialPropertiesToType(config, Type);

  if (Base.additionalProperties) {
    // the additionalProperties flag should trickle down if true
    Type.additionalProperties = true;
  }

  _concatToArray(Type, '_onSet', Base._onSet);

  // Store reference to Model
  Object.defineProperty(Type, 'Model', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: Model
  });

  if (coerce) {
    // Create a proxy coerce function that guarantees that options
    // argument will be provided.
    Type.coerce = function (value, options) {
      return coerce.call(Type, value, _toOptions(options));
    };
  }

  // provide method to extend this model
  Type.extend = function (config) {
    return _extend(Type, config);
  };

  Type.isWrapped = function () {
    return (wrap !== false);
  };

  let factory;
  if (wrap && wrap.constructor === Function) {
    factory = wrap;
  } else {
    wrap = (wrap !== false);

    factory = function (data, options) {
      if (wrap && (arguments.length === 0)) {
        return new Type();
      }

      let instance;

      // see if the data is already an instance
      if ((data != null) && (instance = _checkInstance(data, wrap, Type)) !== NOT_INSTANCE) {
        // we already have instance of correct type so return it
        return instance;
      }

      if (coerce) {
        data = coerce.call(Type, data, (options = _toOptions(options)));

        // If the coerce function returns null/undefined then not
        // much more we can do so simply return that value
        if (data == null) {
          return data;
        }

        // Do we have the correct type after coercion?
        if ((instance = _checkInstance(data, wrap, Type)) !== NOT_INSTANCE) {
          // coercion return instance of correct type so return it
          return instance;
        }
      } else if (data == null) {
        return data;
      }

      data = Model.unwrap(data);

      if (!wrap) {
        // if we're not wrapping or data is null then simply return the raw value
        return data;
      }

      if (Array.isArray(data)) {
        return Type.convertArray(data, options);
      }

      // return new model instance
      return new Type(data, options);
    };
  }

  Type.wrap = factory;

  if (!Type.create) {
    Type.create = factory;
  }

  inherit(Type, Base);

  const classPrototype = Type.prototype;
  classPrototype.Model = Type;

  let propertyNames;
  if ((properties && (propertyNames = Object.keys(properties)).length > 0) || mixins) {
    // Use prototype chaining to create property map
    Type.Properties = function () {
      // nothing to do here
    };

    if (Base.Properties) {
      inherit(Type.Properties, Base.Properties);
    } else {
      Type.Properties.prototype = {};
    }

    if (mixins) {
      const mixinProperties = _emptyObject();
      mixins.forEach(function (mixin) {
        _installMixin(mixin, Type, Base, mixinProperties);
      });

      const mixinPropertyNames = Object.keys(mixinProperties);

      if (mixinPropertyNames.length) {
        if (properties) {
          // combine mixin properties with properties provided for Type
          // but give precedence to the Type properties.
          for (let i = 0; i < mixinPropertyNames.length; i++) {
            const propertyName = mixinPropertyNames[i];
            if (!properties.hasOwnProperty(propertyName)) {
              properties[propertyName] = mixinProperties[propertyName];
              propertyNames.push(propertyName);
            }
          }
        } else {
          // use properties from mixin
          properties = mixinProperties;
          propertyNames = mixinPropertyNames;
        }
      }
    }

    if (properties) {
      const propertiesPrototype = Type.Properties.prototype;
      propertyNames.forEach(function (propertyName) {
        const property = _toProperty(propertyName, properties[propertyName], resolver, Type);
        const propertyKey = property.getKey();

        // Put the properties in the prototype by name and property
        propertiesPrototype[propertyName] = property;
        if (propertyName !== propertyKey) {
          propertiesPrototype[propertyKey] = property;
        }

        let funcName;
        const funcSuffix = _initialUpperCase(propertyName);

        // generate getter
        if (property.getGetter() !== null) {
          funcName = 'get' + funcSuffix;
          classPrototype[funcName] = _generateGetter(property);
        }

        // generate setter
        if (property.getSetter() !== null) {
          funcName = 'set' + funcSuffix;
          classPrototype[funcName] = _generateSetter(property);
        }

        // generate addTo<Property> if property is Array type
        if (property.getType() === ArrayType) {
          funcName = 'addTo' + funcSuffix;
          classPrototype[funcName] = _generateAddValueTo(property);
        }
      });
    }

    Type.properties = new Type.Properties();
  } else {
    Type.Properties = Base.Properties;
    Type.properties = Base.properties || EMPTY_PROPERTIES;
  }

  if (Type.hasProperties()) {
    const _allProperties = [];
    Type.forEachProperty(function (property) {
      _allProperties.push(property.getKey());
    });

    // We define a constructor function for the "data" that this
    // Model stores which will allow the JavaScript Engine to create
    // "hidden classes" for the purpose of optimization.
    Type.Data = Data = function (model, rawData, options) {
      const properties = Type.properties;
      let allProperties;
      let len;
      let key;
      let i;

      allProperties = _allProperties;
      len = allProperties.length;

      if (rawData == null) {
        // No raw data so set every property value to undefined
        // as part of our constructor

        // We loop over all properties in a consistent order
        // for the purpose of JavaScript engine optimization.
        // See http://www.html5rocks.com/en/tutorials/speed/v8/
        for (i = 0; i < len; i++) {
          key = allProperties[i];
          this[key] = undefined;
        }
      } else {
        let errors;
        if (options) {
          if (Array.isArray(options)) {
            // since options is an array we treat as the output array
            // for errors
            options = {
              errors: (errors = options)
            };
          } else {
            errors = options.errors;
          }
        }

        const modelData = model.data = _emptyObject();
        let additionalData;

        if (Type.additionalProperties) {
          additionalData = _emptyObject();
        }

        // use setters to make sure values get properly coerced
        for (key in rawData) {
          if ((rawData.hasOwnProperty && rawData.hasOwnProperty(key)) || rawData[key] !== undefined) {
            const property = properties[key];
            if (property) {
              _set(model, modelData, property, rawData[key], options);
            } else if (additionalData) {
              additionalData[key] = rawData[key];
            } else if (errors) {
              errors.push('Unrecognized property: ' + key);
            }
          }
        }

        // We loop over all properties in a consistent order
        // for the purpose of JavaScript engine optimization.
        // See http://www.html5rocks.com/en/tutorials/speed/v8/
        for (i = 0; i < len; i++) {
          key = allProperties[i];
          this[key] = modelData[key];
        }

        // If there are additional properties then we add those
        // after the known properties. These will propbably
        // de-optimize this instance since the order might be
        // inconsistent but not much we can do about that.
        if (additionalData) {
          for (key in additionalData) {
            this[key] = additionalData[key];
          }
        }
      }
    };

    Data.prototype = null;
  }

  if (prototype) {
    Object.keys(prototype).forEach(function (key) {
      classPrototype[key] = prototype[key];
    });
  }

  return Type;
}

Model.extend = function (config, resolver) {
  return _extend(Model, config, resolver);
};

primitives = require('./primitives');
ArrayType = primitives.array;
