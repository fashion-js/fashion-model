var ArrayType;
var primitives;
var NOT_INSTANCE = {};

var inherit = require('raptor-util/inherit');
var Model;
var EMPTY_PROPERTIES = {};

function _toModel(obj) {
    return (obj == null) ? obj : (obj.$model || obj);
}

function _forProperty(property, options, work) {
    options = _toOptions(options);
    var origProperty = options.property;
    options.property = property;
    work(options);
    options.property = origProperty;
    return options;
}

function _notifySet(model, propertyName, oldValue, newValue, property) {
    var Type = model.constructor;
    if (Type._onSet) {
        var event = {
            model: model,
            propertyName: propertyName,
            oldValue: _toModel(oldValue),
            newValue: _toModel(newValue),
            property: property
        };

        var len = Type._onSet.length;
        for (var i = 0; i < len; i++) {
            Type._onSet[i](model, event);
        }
    }
}

function _get(model, property, options) {
    var propertyName = property.getProperty();
    var getter = property.getGetter();
    if (getter) {
        // the getter provided for the property needs to do all of
        // the work...
        return getter.call(model, propertyName, property);
    }

    // pull out the raw value...
    var value = model.data[propertyName];

    var Type = property.getType();

    if ((value != null) && Type.isWrapped()) {
        // Type is wrapped. Make sure we return an instance of the actual
        // type and not the raw value
        var returnValue;
        _forProperty(property, options, function(options) {
            returnValue = Type.wrap(value, options);
        });
        return returnValue;
    } else {
        return value;
    }
}

function _set(model, property, value, options) {
    var Type = property.getType();

    // this the value that we return (it may be the result of wrapping/coercing the original value)
    var returnValue;
    var wrapped = Type.isWrapped();

    if (Model.isModel(value) && Type.isInstance(value)) {
        // value is expected type
        // store raw data in this model's data
        value = Model.unwrap(value);
    } else if (!wrapped && Type.coerce) {
        // Only call coerce if this type is not wrapped
        // (otherwise we'd call coerce twice which is wasteful)

        // The coerce function needs some context in the options
        options = _forProperty(property, options, function(options) {
            value = Type.coerce.call(Type, value, options);
        });
    }

    var propertyName = property.getProperty();
    var oldValue = model.data[propertyName];

    var setter = property.getSetter();
    if (setter) {
        // setter will do all of the work
        setter.call(model, propertyName, value, property);

        // get the new value
        value = model.data[propertyName];
    }

    if ((value != null) && wrapped) {
        options = _forProperty(property, options, function(options) {
            // recursively call setters
            // The return value is the wrapped value
            returnValue = Type.wrap(value, options);

            // the value that gets stored in data is the unwrapped value
            value = Model.unwrap(returnValue);
        });
    } else {
        // value is not wrapped so simply return the raw value
        returnValue = value;
    }

    if (oldValue !== value) {
        model.data[propertyName] = value;
        _notifySet(model, propertyName, oldValue, value, property);
    }

    return returnValue;
}

function _generateGetter(property) {
    return function(options) {
        return _get(this, property, options);
    };
}

function _generateSetter(property) {
    return function(value, options) {
        return _set(this, property, value, options);
    };
}

// This function will be used to make sure an array value
// exists for the given property
function _ensureArray(property, wrapped) {
    var propertyName = property.getProperty();
    var array = this.data[propertyName];
    if (!array) {
        this.data[propertyName] = array = [];
    }

    // initialize the model array if it doesn't already exist
    if (!array.$model) {
        ArrayType._initModelArray(array, wrapped);
    }

    return array;
}

function _generateAddValueTo(property) {
    var items = property.items;
    var ItemType = items && items.type;
    if (ItemType && ItemType.isWrapped()) {
        // the addTo<Property> function will need to wrap each item
        // when adding it to the array
        return function(value, options) {
            var array = _ensureArray.call(this, property, true);
            var model = ItemType.wrap(value, options);
            array.push(Model.unwrap(model));
            array.$model.push(model);
        };
    } else {
        // the addTo<Property> function should add raw value to array
        // (call the type coercion function if it exists)
        return function(value, options) {
            var array = _ensureArray.call(this, property, false);
            array.push((ItemType && ItemType.coerce) ? ItemType.coerce(value, options) : value);
        };
    }
}

function _initialUpperCase(str) {
    return str.charAt(0).toUpperCase() + str.substring(1);
}

function _convertArray(array, options) {
    return ArrayType._convertArrayItems(array, this, options);
}

// This is the constructor that gets called when ever a Model (or derived type)
// is created
module.exports = Model = function Model(data, options) {
    var Derived = this.constructor;

    if (Derived.constructable === false) {
        throw new Error('Instances of this type cannot be created. data: ' + data);
    }

    if (Derived.hasProperties()) {
        var properties = Derived.properties;
        this.data = data || {};
        if (data != null) {
            var errors;
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

            // use setters to make sure values get properly coerced
            for (var key in data) {
                if (data.hasOwnProperty(key) && (key !== '$model')) {
                    var property = properties[key];
                    if (property) {
                        _set(this, property, data[key], options);
                    } else if (!Derived.additionalProperties && errors) {
                        errors.push('Unrecognized property: ' + key);
                    }
                }
            }
        }
        this.data.$model = this;
    } else {
        this.data = data;
    }
};

Model.typeName = 'Model';

// This is a internal helper function that will do some work in the context
// of a property. The options.property value will be temporarily updated to
// reflect the given property and then options.property will be restored
// to its original value after the work is executed.
Model._forProperty = _forProperty;

Model.isModel = function(obj) {
    return obj && obj.Model;
};

Model.unwrap = function(obj) {
    // if obj is Model instance then return raw data, otherwise, return obj
    return Model.isModel(obj) ? obj.data : obj;
};

Model.clean = function(obj, errors) {
    if (Array.isArray(obj)) {
        // use the model array if it is available, otherwise,
        // use the raw array
        var array = obj.$model || obj;
        var i = array.length;
        var result = new Array(i);
        while(--i >= 0) {
            result[i] = Model.clean(array[i], errors);
        }
        return result;
    } else {
        if ((obj = Model.unwrap(obj)) == null) {
            return obj;
        }

        if (obj.$model) {
            return obj.$model.clean(errors);
        } else if ((obj.constructor !== Date) && (typeof obj === 'object')) {
            var clean = {};
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    var value = obj[key];
                    clean[key] = Model.clean(value, errors);
                }
            }
            return clean;
        } else {
            return obj;
        }
    }
};

Model.hasProperties = function() {
    return (this.properties !== EMPTY_PROPERTIES) || (this.additionalProperties === true);
};

Model.hasProperty = function(propertyName) {
    return !!this.properties[propertyName];
};

Model.getProperties = function() {
    return this.properties;
};

Model.getProperty = function(propertyName) {
    return this.properties[propertyName];
};

Model.forEachProperty = function(options, callback) {
    if (arguments.length === 1) {
        callback = arguments[0];
        options = {};
    }

    var inherited = (options.inherited !== false);

    var proto = this.Properties.prototype;
    var seen = {};
    do {
        for (var key in proto) {
            if (!seen[key] && proto.hasOwnProperty(key)) {
                var property = proto[key];
                if (property.constructor === Property) {
                    if (key === property.getName()) {
                        callback(property);
                    }
                }
                seen[key] = true;
            }
        }
    } while(inherited && ((proto = Object.getPrototypeOf(proto)) != null));
};

Model.preventConstruction = function() {
    this.constructable = false;
};

Model.isCompatibleWith = function(other) {
    var cur = this;
    do {
        if (cur === other) {
            return true;
        }
    } while((cur = (cur.$super)));
    return false;
};

Model.isInstance = function(value) {
    return (value instanceof this);
};

Model.isPrimitive = function() {
    return false;
};

Model.coercionError = function(value, options, errorMessage) {
    var message = '';
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
        var err = new Error(message);
        err.source = Model;
        throw err;
    }
};

function _syncArrays(rawArray, modelArray) {
    var len = rawArray.length = modelArray.length;
    var i = len;
    while(--i >= 0) {
        rawArray[i] = Model.unwrap(modelArray[i]);
    }
}

function _jsonStringifyReplacer(key, value) {
    if (key === '$model') {
        return undefined;
    }

    if (value != null) {
        if (Model.isModel(value)) {
            var rawValue = Model.unwrap(value);
            if (value.Model === ArrayType) {
                _syncArrays(rawValue, value);
            }
            value = rawValue;
        } else if (value.$model && value.$model.Model === ArrayType) {
            _syncArrays(value, value.$model);
        }
    }

    return value;
}

Model.stringify = function(obj, pretty) {
    return JSON.stringify(obj, _jsonStringifyReplacer, pretty ? '    ' : undefined);
};

var Model_proto = Model.prototype;

Model_proto.unwrap = function() {
    return this.data;
};

/**
 * Creates a deep clone of the data stored in this object with all temporary
 * and non-persisted values removed.
 */
Model_proto.clean = function(errors) {
    var data = this.data;

    var Derived = this.constructor;
    var properties = Derived.properties;

    if (Derived.hasProperties()) {
        var clone = {};
        for (var key in data) {

            if (data.hasOwnProperty(key) && (key !== '$model')) {
                var property = properties[key];
                var value = data[key];
                if (property && (property.isPersisted())) {
                    // no need to clean null/undefined values
                    if (value != null) {
                        var propertyType = property.type;
                        var clean = propertyType.clean;
                        if (clean) {
                            // call the clean function provided by model
                            value = propertyType.clean(value.$model || value, errors);
                        } else if (value.Model || value.$model || propertyType.isWrapped()) {
                            // value is a Model instance or it is data with a $model or it is something that could be wrapped
                            // use the default clean function
                            value = Model.clean(value, errors);
                        }
                    }

                    // put the cleaned value into the clone
                    clone[key] = value;
                } else if (Derived.additionalProperties) {
                    if (value.Model || value.$model) {
                        value = Model.clean(value, errors);
                    }
                    // simply copy the additional property
                    clone[key] = value;
                } else if (errors) {
                    errors.push('Unrecognized property: ' + key);
                }
            }
        }
        return clone;
    } else {
        return data;
    }
};

function _getProperty(model, propertyName, errors) {
    var Type = model.constructor;
    var properties = Type.properties;
    var property = properties[propertyName];
    if (!property) {
        if (!Type.additionalProperties) {
            var err = new Error('Invalid property: ' + propertyName);
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
 *      or an array which will have any errors added to it
 */
Model_proto.set = function(propertyName, value, options) {
    var property = _getProperty(this, propertyName, options);
    if (property) {
        _set(this, property, value, options);
    } else {
        var oldValue = this.data[propertyName];
        if (oldValue !== value) {
            this.data[propertyName] = value;
            _notifySet(this, propertyName, oldValue, value);
        }
    }
};

/**
 * Get value of property with given propertyName.
 * @param {String} propertyName the property name
 * @param {Object|Array} options an optional object that specifies options
 *      or an array which will have any errors added to it
 */
Model_proto.get = function(propertyName, options) {
    var property = _getProperty(this, propertyName, options);
    if (property) {
        return _get(this, property);
    } else {
        return this.data[propertyName];
    }
};

Model_proto.stringify = function(pretty) {
    return Model.stringify(this.data, pretty);
};

function Property(config) {
    for (var key in config) {
        if (config.hasOwnProperty(key)) {
            this[key] = config[key];
        }
    }
}

var Property_proto = Property.prototype;

Property_proto.getName = function() {
    return this.name;
};

Property_proto.getProperty = function() {
    return this.property;
};

Property_proto.getType = function() {
    return this.type;
};

Property_proto.getItems = function() {
    return this.items;
};

Property_proto.getGetter = function() {
    return this.get;
};

Property_proto.getSetter = function() {
    return this.set;
};

Property_proto.isPersisted = function() {
    return (this.persist !== false);
};

function Items(owner) {
    this.owner = owner;
}

Items.prototype.getName = function() {
    return this.owner.getName();
};

var Property_proto = Items.prototype;

Property_proto.getName = function() {
    return this.name;
};

function _parseType(type) {
    if (type.Model) {
        // type is derived from Model
        return type;
    }

    switch(type) {
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

    throw new Error('Unrecognized type. Expected type derived from Model or primitive type.');
}

function _parseTypeStr(typeStr, propertyConfig, resolver, Type) {
    var len = typeStr.length;
    if ((typeStr.charAt(len - 2) === '[') && (typeStr.charAt(len - 1) === ']')) {
        // array type
        propertyConfig.type = ArrayType;
        propertyConfig.items = {};
        _parseTypeStr(typeStr.substring(0, len - 2), propertyConfig.items, resolver, Type);
    } else {
        propertyConfig.type = _resolve(typeStr, resolver, Type);
    }
}

function _resolve(typeName, resolver, Type) {
    var type = primitives[typeName];
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

function _parseTypeConfig(propertyConfig, resolver, Type) {
    if (Array.isArray(propertyConfig)) {
        propertyConfig = {
            type: propertyConfig
        };
    } else if ((typeof propertyConfig) !== 'object') {
        propertyConfig = {
            type: propertyConfig
        };
    }

    var type = propertyConfig.type;
    if (type) {
        if (Array.isArray(type)) {
            // handle short-hand notation for Array types
            propertyConfig.type =  ArrayType;
            if (type.length) {
                var items = type[0];
                if (items != null) {
                    propertyConfig.items = _parseTypeConfig(items, resolver, Type);
                }
            }
        } else if (type.constructor === String) {
            _parseTypeStr(type, propertyConfig, resolver, Type);
        } else {
            // handle normal notation for types
            propertyConfig.type = _parseType(type);

            // Convert the subtype to special type if necessary
            if (propertyConfig.items) {
                propertyConfig.items = _parseTypeConfig(propertyConfig.items, resolver, Type);
            }
        }
    } else {
        propertyConfig.type = primitives.object;
    }

    return propertyConfig;
}

function _toProperty(name, propertyConfig, resolver, Type) {
    propertyConfig = _parseTypeConfig(propertyConfig, resolver, Type);
    propertyConfig.name = name;
    propertyConfig.property = propertyConfig.property || name;

    return new Property(propertyConfig);
}

var SPECIAL_PROPERTIES = {
    init: 1,
    wrap: 1,
    unwrap: 1,
    coerce: 1,
    properties: 1,
    prototype: 1,
    mixins: 1
};

function _copyNonSpecialPropertiesToType(config, Type) {
    for (var key in config) {
        if (config.hasOwnProperty(key) && !SPECIAL_PROPERTIES[key]) {
            Type[key] = config[key];
        }
    }
}

function _toOptions(options) {
    if (options == null) {
        return {};
    }

    if (Array.isArray(options)) {
        return {
            errors: options
        };
    }

    return options;
}

function _addToArray(obj, propertyName, value) {
    if (!value) {
        return;
    }

    var arr = obj[propertyName] || (obj[propertyName] = []);
    arr.push(value);
}

function _concatToArray(obj, propertyName, otherArr) {
    if (!otherArr) {
        return;
    }

    var arr = obj[propertyName] || (obj[propertyName] = []);
    for (var i = 0; i < otherArr.length; i++) {
        arr.push(otherArr[i]);
    }
}

function _installMixin(Type, mixin) {
    var key;
    if (mixin.id) {
        key = '_mixin_' + mixin.id;
        if (Type.properties[key]) {
            // this mixin is already installed
            return;
        }

        Type.Properties.prototype[key] = true;
    }


    var mixinPrototype = mixin.prototype;
    if (mixinPrototype) {
        for (key in mixinPrototype) {
            if (mixinPrototype.hasOwnProperty(key)) {
                Type.prototype[key] = mixinPrototype[key];
            }
        }
    }

    _addToArray(Type, '_onCreate', mixin.onCreate);
    _addToArray(Type, '_onSet', mixin.onSet);
}

function _extend(Base, config, resolver) {
    config = config || {};

    var init = config.init;
    var wrap = config.wrap;
    var unwrap = config.unwrap;
    var coerce = config.coerce;
    var properties = config.properties;
    var prototype = config.prototype;
    var mixins = config.mixins;

    function Derived(data, options) {
        Derived.$super.call(this, data, options);

        var onCreateArr = Derived._onCreate;
        if (onCreateArr) {
            for (var i = 0; i < onCreateArr.length; i++) {
                onCreateArr[i](this);
            }
        }

        if (init) {
            init.call(this, data, options);
        }
    }

    // Selectively copy properties from Model to Derived
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
    ].forEach(function(property) {
        Derived[property] = Model[property];
    });

    Derived.convertArray = _convertArray;

    // Now copy any properties from config to Derived that might
    // override any of the special prpoerties that were copied above
    _copyNonSpecialPropertiesToType(config, Derived);

    if (Base.additionalProperties) {
        // the additionalProperties flag should trickle down if true
        Derived.additionalProperties = true;
    }

    _concatToArray(Derived, '_onSet', Base._onSet);

    // Store reference to Model
    Derived.Model = Model;

    if (coerce) {
        // Create a proxy coerce function that guarantees that options
        // argument will be provided.
        Derived.coerce = function(value, options) {
            return coerce.call(Derived, value, _toOptions(options));
        };
    }

    // provide method to extend this model
    Derived.extend = function(config) {
        return _extend(Derived, config);
    };

    Derived.isWrapped = function() {
        return (wrap !== false);
    };

    var factory;
    if (wrap && wrap.constructor === Function) {
        factory = wrap;
    } else {
        wrap = (wrap !== false);

        var checkInstance = function(data) {
            if (data == null) {
                // null/undefined qualify as instances
                return data;
            }

            var model = data.$model || data;
            return wrap && Derived.isInstance(model) ? model : NOT_INSTANCE;
        };

        factory = function(data, options) {
            if (wrap && (arguments.length === 0)) {
                return new Derived();
            }

            var instance;

            // see if the data is already an instance
            if ((instance = checkInstance(data)) !== NOT_INSTANCE) {
                return instance;
            }

            if (coerce) {
                data = coerce.call(Derived, data, (options = _toOptions(options)));

                // Do we have the correct type after coercion?
                if ((instance = checkInstance(data)) !== NOT_INSTANCE) {
                    return instance;
                }
            }

            if (!wrap) {
                // if we're not wrapping then simply return the raw value
                return data;
            }

            // We might have data associated with a Model instance of
            // the wrong type so dissociate the data with the Model instance
            data = Model.unwrap(data);
            delete data.$model;

            if (Array.isArray(data)) {
                return Derived.convertArray(data, options);
            }

            // return existing model or create a new model
            // NOTE: Model constructor will store $model in data
            return new Derived(data, options);
        };
    }

    Derived.create = Derived.wrap = factory;

    inherit(Derived, Base);

    var classPrototype = Derived.prototype;
    classPrototype.Model = Derived;

    if (unwrap) {
        classPrototype.unwrap = unwrap;
    }

    var propertyNames;
    if ((properties && (propertyNames = Object.keys(properties)).length > 0) || mixins) {
        // Use prototype chaining to create property map
        Derived.Properties = function() {};

        if (Base.Properties) {
            inherit(Derived.Properties, Base.Properties);
        }

        if (properties) {
            var propertiesPrototype = Derived.Properties.prototype;
            propertyNames.forEach(function(name) {
                var property = _toProperty(name, properties[name], resolver, Derived);
                var propertyName = property.getProperty();

                // Put the properties in the prototype by name and property
                propertiesPrototype[name] = property;
                if (name !== propertyName) {
                    propertiesPrototype[propertyName] = property;
                }

                var funcName;
                var funcSuffix = _initialUpperCase(name);

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

        Derived.properties = new Derived.Properties();

    } else {
        Derived.Properties = Base.Properties;
        Derived.properties = Base.properties || EMPTY_PROPERTIES;
    }

    if (prototype) {
        Object.keys(prototype).forEach(function(key) {
            classPrototype[key] = prototype[key];
        });
    }

    if (mixins) {
        mixins.forEach(function(mixin) {
            _installMixin(Derived, mixin);
        });
    }

    return Derived;
}

Model.extend = function(config, resolver) {
    return _extend(Model, config, resolver);
};

primitives = require('./primitives');
ArrayType = primitives.array;