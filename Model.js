// var DateType;
// var BooleanType;
// var NumberType;
// var IntegerType;
// var StringType;
var ArrayType;
var primitives;

//var TYPE_BY_NAME = {};

var inherit = require('raptor-util/inherit');
var Model;
var EMPTY_ATTRIBUTES = {};

function _get(model, property) {
    var getter = property.getGetter();
    if (getter) {
        return getter.call(model, property);
    }

    var value = model.data[property.getProperty()];
    if (value == null) {
        return value;
    }

    var type = property.getType();
    if (Model.isModelType(type) && type.isWrapped()) {
        if (type.isAutoUnwrapped()) {
            // auto unwrap
            value = Model.unwrap(value);
        } else {
            // make sure we return an instance of the actual type and not the raw value
            value = property.getType().wrap(value);
        }
    }

    return value;
}

function _set(model, property, value, errors) {
    var type = property.getType();

    if (Model.isModel(value) && (value instanceof type)) {
        // value is expected type
        // store raw data in this model's data
        value = value.data;
    } else if (type.coerce) {
        value = type.coerce(value, property, errors);
    }

    var setter = property.getSetter();
    if (setter) {
        return setter.call(model, property.getProperty(), value, property);
    }

    if ((value != null) && Model.isModelType(type) && type.isWrapped()) {
        // recursively call setters
        type.wrap(value, errors);
    }

    model.data[property.getProperty()] = Model.unwrap(value);
}

function _generateGetter(property) {
    return function () {
        return _get(this, property);
    };
}

function _generateSetter(property) {
    return function(value) {
        return _set(this, property, value);
    };
}

function _generateForEach(property) {
    var subtype = property.getSubtype();
    var SubtypeModel = (subtype && Model.isModelType(subtype)) ? subtype : null;

    return function(callback) {
        var values = this.data[property.getProperty()];
        if (values == null || !values.length) {
            return;
        }

        var i = 0;
        var len = values.length;
        if (SubtypeModel) {
            for (; i < len; i++) {
                callback(SubtypeModel.wrap(values[i]), i);
            }
        } else {
            for (; i < len; i++) {
                callback(values[i], i);
            }
        }
    };
}

function _generateArrayIndexGetter(property) {
    var subtype = property.getSubtype();
    var SubtypeModel = (subtype && Model.isModelType(subtype)) ? subtype : null;
    return function(index) {
        var values = this.data[property.getProperty()];
        if (values == null || !values.length) {
            return undefined;
        }

        var value = values[index];
        return (SubtypeModel) ? SubtypeModel.wrap(value) : value;
    };
}

function _initialUpperCase(str) {
    return str.charAt(0).toUpperCase() + str.substring(1);
}

module.exports = Model = function Model(data, errors) {
    var Derived = this.constructor;

    if (Derived.constructable === false) {
        throw new Error('Instances of this type cannot be created. data: ' + data);
    }

    if (Derived.hasProperties()) {
        var properties = Derived.properties;
        this.data = data || {};
        if (data != null) {
            // use setters to make sure values get properly coerced
            for (var key in data) {
                if ((key.charAt(0) !== '$') && data.hasOwnProperty(key)) {

                    var property = properties[key];
                    if (property) {
                        _set(this, property, data[key], errors);
                    } else if (!Derived.allowAnyProperty && errors) {
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

Model.isModelType = function(type) {
    return type.Model;
};

Model.isModel = function(obj) {
    return obj && obj.Model;
};

Model.unwrap = function(obj) {
    if (obj == null) {
        return obj;
    }

    if (obj.Model) {
        return obj.data;
    }

    return obj;
};

function _clean(obj, errors) {
    if ((obj = Model.unwrap(obj)) == null) {
        return obj;
    }

    if (obj.$model) {
        return obj.$model.clean(errors);
    }

    return obj;
}

Model.clean = function(obj, errors) {
    if (Array.isArray(obj)) {
        var result = new Array(obj.length);
        var i = obj.length;
        while(--i >= 0) {
            result[i] = _clean(obj[i], errors);
        }
        return result;
    } else {
        return _clean(obj, errors);
    }
};

Model.hasProperties = function() {
    return this.properties !== EMPTY_ATTRIBUTES;
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

Model.forEachProperty = function(callback) {
    var proto = this.Properties.prototype;
    do {
        for (var key in proto) {
            if (proto.hasOwnProperty(key)) {
                var property = proto[key];
                if (property.constructor === Property) {
                    if (key === property.getName()) {
                        callback(property);
                    }
                }
            }
        }
    } while((proto = Object.getPrototypeOf(proto)) != null);
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

Model.coercionError = function(value, property, errors) {
    var message = '';
    if (property) {
        message += property.getName() + ': ';
    }
    message += 'Invalid value: ' + value;

    if (errors) {
        errors.push(message);
    } else {
        var err = new Error(message);
        err.source = Model;
        throw err;
    }
};

function _jsonStringifyReplacer(key, value) {
    if (key.charAt(0) === '$') {
        return undefined;
    }

    if (value != null) {
        if (Model.isModel(value)) {
            return Model.unwrap(value);
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
            if ((key.charAt(0) !== '$') && data.hasOwnProperty(key)) {
                var property = properties[key];
                var value = data[key];
                if (property && (property.isPersisted())) {
                    clone[key] = Model.clean(value, errors);
                } else if (!Derived.allowAnyProperty && errors) {
                    errors.push('Unrecognized property: ' + key);
                }
            }
        }
        return clone;
    } else {
        return data;
    }
};

Model_proto.set = function(propertyName, value, errors) {
    var properties = this.constructor.properties;
    _set(this, properties[propertyName], value, errors);
};

Model_proto.get = function(propertyName) {
    var properties = this.constructor.properties;
    return _get(this, properties[propertyName]);
};

Model_proto.stringify = function(pretty) {
    return Model.stringify(this.data, pretty);
};

Model_proto.toJSON = function() {
    return this.clean();
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

Property_proto.getSubtype = function() {
    return this.subtype;
};

Property_proto.isModelType = function() {
    return Model.isModelType(this.getType());
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

function _parseType(type) {
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
    case Array:
        return ArrayType;
    }

    return type;
}

function _resolve(typeName, resolver) {
    var type = primitives[typeName];
    if (type) {
        return type;
    }

    if (resolver) {
        if ((type = resolver(typeName))) {
            return type;
        }
    }

    throw new Error('Invalid type: ' + typeName);
}

function _toProperty(name, propertyConfig, resolver) {
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
                var subtype = type[0];
                if (subtype != null) {
                    if (subtype.constructor === String) {
                        propertyConfig.subtype = _resolve(subtype, resolver);
                    } else {
                        propertyConfig.subtype = _parseType(subtype);
                    }
                }
            }
        } else if (type.constructor === String) {
            var len = type.length;
            if ((type.charAt(len - 2) === '[') && (type.charAt(len - 1) === ']')) {
                // array type
                propertyConfig.type = ArrayType;

                type = type.substring(0, len - 2);
                propertyConfig.subtype = _resolve(type, resolver);
            } else {
                propertyConfig.type = _resolve(type, resolver);
            }
        } else {
            // handle normal notation for types
            propertyConfig.type = _parseType(type);

            // Convert the subtype to special type if necessary
            if (propertyConfig.subtype) {
                propertyConfig.subtype = _parseType(propertyConfig.subtype);
            }
        }
    } else {
        propertyConfig.type = Object;
    }


    propertyConfig.name = name;
    propertyConfig.property = propertyConfig.property || name;

    return new Property(propertyConfig);
}

var SPECIAL_PROPERTIES = {
    init: 1,
    wrap: 1,
    unwrap: 1,
    autoUnwrap: 1,
    coerce: 1,
    properties: 1,
    prototype: 1
};

function _copyNonSpecialPropertiesToType(config, Type) {
    for (var key in config) {
        if (config.hasOwnProperty(key) && !SPECIAL_PROPERTIES[key]) {
            Type[key] = config[key];
        }
    }
}

function _extend(Base, config, resolver) {
    config = config || {};

    var init = config.init;
    var wrap = config.wrap;
    var unwrap = config.unwrap;
    var autoUnwrap = !!config.autoUnwrap;
    var coerce = config.coerce;
    var properties = config.properties;
    var prototype = config.prototype;

    function Derived() {
        Derived.$super.apply(this, arguments);
        if (init) {
            init.apply(this, arguments);
        }
    }

    _copyNonSpecialPropertiesToType(config, Derived);

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
        'isCompatibleWith'
    ].forEach(function(property) {
        Derived[property] = Model[property];
    });

    // Store reference to Model
    Derived.Model = Model;

    if (coerce) {
        Derived.coerce = function(value, property, errors) {
            // Simple proxy for the coerce function to fix arguments
            if (Array.isArray(property)) {
                errors = arguments[1];
                property = null;
            }

            return coerce.call(Derived, value, property, errors);
        };
    }

    // provide method to extend this model
    Derived.extend = function(config) {
        return _extend(Derived, config);
    };

    Derived.isWrapped = function() {
        return (wrap !== false);
    };

    Derived.isAutoUnwrapped = function() {
        return autoUnwrap;
    };

    var factory;
    if (wrap && wrap.constructor === Function) {
        factory = wrap;
    } else {
        factory = function(data, errors) {
            if (arguments.length === 0) {
                return new Derived();
            }

            if (data instanceof Derived) {
                return data;
            }

            if (coerce) {
                data = coerce.call(Derived, data, null /* property */, errors);
            }

            if (data == null) {
                return data;
            }

            if (Model.isModel(data)) {
                if (data instanceof Derived) {
                    return data;
                } else {
                    data = Model.unwrap(data);
                    delete data.$model;
                }
            }

            if (wrap === false) {
                return data;
            }

            if (Array.isArray(data)) {
                // TODO: Handle wrapping Array?
                // If so, replace items or return new Array?
                throw new Error('Wrapping Array object is not allowed.');
            }

            // return existing model or create a new model
            // NOTE: Model constructor will store $model in data
            return (data && data.$model) || new Derived(data, errors);
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
    if (properties && (propertyNames = Object.keys(properties)).length > 0) {
        // Use prototype chaining to create property map
        Derived.Properties = function() {};

        if (Base.Properties) {
            inherit(Derived.Properties, Base.Properties);
        }

        if (properties) {
            var propertiesPrototype = Derived.Properties.prototype;
            propertyNames.forEach(function(name) {
                var property = _toProperty(name, properties[name], resolver);
                var propertyName = property.getProperty();

                // Put the properties in the prototype by name and property
                propertiesPrototype[name] = property;
                if (name !== propertyName) {
                    propertiesPrototype[propertyName] = property;
                }

                var funcName;
                var funcSuffix = _initialUpperCase(name);


                if (property.getGetter() !== null) {
                    funcName = 'get' + funcSuffix;
                    classPrototype[funcName] = _generateGetter(property);
                }

                if (property.getSetter() !== null) {
                    funcName = 'set' + funcSuffix;
                    classPrototype[funcName] = _generateSetter(property);
                }

                if (property.getType() === ArrayType) {
                    var singular;
                    if (property.singular) {
                        singular = _initialUpperCase(property.singular);
                    } else {
                        singular = funcSuffix.replace(/(ies)|(s|List|Set)$/, function(match, ies, truncate) {
                            // cities --> city
                            return ies ? 'y' : '';
                        });
                    }

                    funcName = 'forEach' + singular;
                    classPrototype[funcName] = _generateForEach(property);

                    funcName = 'get' + singular;

                    if (singular === funcSuffix) {
                        funcName += 'Item';
                    }

                    classPrototype[funcName] = _generateArrayIndexGetter(property);
                }
            });
        }

        Derived.properties = new Derived.Properties();

    } else {
        Derived.Properties = Base.Properties;
        Derived.properties = Base.properties || EMPTY_ATTRIBUTES;
    }

    if (prototype) {
        Object.keys(prototype).forEach(function(key) {
            classPrototype[key] = prototype[key];
        });
    }

    return Derived;
}

Model.extend = function(config, resolver) {
    return _extend(Model, config, resolver);
};

primitives = require('./primitives');
ArrayType = primitives.array;
