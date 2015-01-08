var DateType;

var inherit = require('raptor-util/inherit');
var Model;
var EMPTY_ATTRIBUTES = {};

function _get(model, attribute) {
    var getter = attribute.getGetter();
    if (getter) {
        return getter.call(model, attribute);
    }
    
    var value = model.data[attribute.getProperty()];
    if (value == null) {
        return value;
    }
    
    var type = attribute.getType();
    if (Model.isModelType(type) && type.isWrapped()) {
        if (type.isAutoUnwrapped()) {
            // auto unwrap
            value = Model.unwrap(value);
        } else {
            // make sure we return an instance of the actual type and not the raw value
            value = attribute.getType().wrap(value);
        }
    }
    
    return value;
}

function _set(model, attribute, value, errors) {
    var type = attribute.getType();
    
    if (Model.isModel(value) && (value instanceof type)) {
        // value is expected type
        // store raw data in this model's data
        value = value.data;
    } else if (type.coerce) {
        value = type.coerce(value, attribute, errors);
    }
    
    var setter = attribute.getSetter();
    if (setter) {
        return setter.call(model, attribute.getProperty(), value, attribute);
    }
    
    if ((value != null) && Model.isModelType(type) && type.isWrapped()) {
        // recursively call setters
        type.wrap(value, errors);
    }
    
    model.data[attribute.getProperty()] = Model.unwrap(value);
}

function _generateGetter(attribute) {
    return function () {
        return _get(this, attribute);
    };
}

function _generateSetter(attribute) {
    return function(value) {
        return _set(this, attribute, value);
    };
}

function _generateForEach(attribute) {
    var subtype = attribute.getSubtype();
    var SubtypeModel = (subtype && Model.isModelType(subtype)) ? subtype : null;
    
    return function(callback) {
        var values = this.data[attribute.getProperty()];
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

function _generateArrayIndexGetter(attribute) {
    var subtype = attribute.getSubtype();
    var SubtypeModel = (subtype && Model.isModelType(subtype)) ? subtype : null;
    return function(index) {
        var values = this.data[attribute.getProperty()];
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
    if (this.constructor.constructable === false) {
        throw new Error('Instances of this type cannot be created. data: ' + data);
    }
    
    if (this.constructor.hasAttributes()) {
        this.data = data || {};
        if (data != null) {
            // use setters to make sure values get properly coerced
            for (var key in data) {
                if ((key.charAt(0) !== '$') && data.hasOwnProperty(key)) {
                    var attribute = this.getAttribute(key);
                    if (attribute) {
                        _set(this, attribute, data[key], errors);
                    } else if (errors) {
                        errors.push('Unrecognized attribute: ' + key);
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
    return obj.$model ? obj.$model.clean(errors) : obj;
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

Model.hasAttributes = function() {
    return this.attributes !== EMPTY_ATTRIBUTES;
};

Model.forEachAttribute = function(callback) {
    var proto = this.Attributes.prototype;
    do {
        for (var key in proto) {
            if (proto.hasOwnProperty(key)) {
                var attribute = proto[key];
                if (attribute.constructor === Attribute) {
                    if (key === attribute.getName()) {
                        callback(attribute);
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

Model.coercionError = function(value, attribute, errors) {
    var message = '';
    if (attribute) {
        message += attribute.getName() + ': ';
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
    
    if (this.constructor.hasAttributes()) {
        var clone = {};
        for (var key in data) {
            if ((key.charAt(0) !== '$') && data.hasOwnProperty(key)) {
                var attribute = this.getAttribute(key);
                var value = data[key];
                if (attribute && (attribute.isPersisted())) {
                    clone[key] = Model.clean(value, errors);
                } else if (errors) {
                    errors.push('Unrecognized attribute: ' + key);
                }
            }
        }
        return clone;
    } else {
        return data;
    }
};

Model_proto.getAttribute = function(attributeName) {
    return this.constructor.attributes[attributeName];
};

Model_proto.set = function(attribute, value, errors) {
    _set(this, this.getAttribute(attribute), value, errors);
};

Model_proto.get = function(attribute) {
    return _get(this, this.getAttribute(attribute));
};

Model_proto.stringify = function(pretty) {
    return Model.stringify(this.data, pretty);
};

Model_proto.toJSON = function() {
    return this.clean();
};

function Attribute(config) {
    for (var key in config) {
        if (config.hasOwnProperty(key)) {
            this[key] = config[key];
        }
    }
}

var Attribute_proto = Attribute.prototype;

Attribute_proto.getName = function() {
    return this.name;
};

Attribute_proto.getProperty = function() {
    return this.property;
};

Attribute_proto.getType = function() {
    return this.type;
};

Attribute_proto.getSubtype = function() {
    return this.subtype;
};

Attribute_proto.isModelType = function() {
    return Model.isModelType(this.getType());
};

Attribute_proto.getGetter = function() {
    return this.get;
};

Attribute_proto.getSetter = function() {
    return this.set;
};

Attribute_proto.isPersisted = function() {
    return (this.persist !== false);
};

function _toAttribute(name, attributeConfig) {
    if (Array.isArray(attributeConfig)) {
        attributeConfig = {
            type: attributeConfig
        };
    } else if ((typeof attributeConfig) !== 'object') {
        attributeConfig = {
            type: attributeConfig
        };
    }

    if (attributeConfig.type) {
        if (Array.isArray(attributeConfig.type)) {
            attributeConfig.subtype = attributeConfig.type[0];
            attributeConfig.type =  Array;
        } else {
            switch(attributeConfig.type) {
            case Date:
                attributeConfig.type = DateType;
                break;
            }
        }
    } else {
        attributeConfig.type = Object;
    }
    

    attributeConfig.name = name;
    attributeConfig.property = attributeConfig.property || name;

    return new Attribute(attributeConfig);
}

var SPECIAL_PROPERTIES = {
    init: 1,
    wrap: 1,
    unwrap: 1,
    autoUnwrap: 1,
    coerce: 1,
    attributes: 1,
    prototype: 1
};

function _copyNonSpecialPropertiesToType(config, Type) {
    for (var key in config) {
        if (config.hasOwnProperty(key) && !SPECIAL_PROPERTIES[key]) {
            Type[key] = config[key];
        }
    }
}

function _extend(Base, config) {
    config = config || {};
    
    var init = config.init;
    var wrap = config.wrap;
    var unwrap = config.unwrap;
    var autoUnwrap = !!config.autoUnwrap;
    var coerce = config.coerce;
    var attributes = config.attributes;
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
        'hasAttributes',
        'preventConstruction',
        'unwrap',
        'coercionError',
        'forEachAttribute',
        'isCompatibleWith'
    ].forEach(function(property) {
        Derived[property] = Model[property];
    });
    
    // Store reference to Model
    Derived.Model = Model;
    
    if (coerce) {
        Derived.coerce = function(value, attribute, errors) {
            // Simple proxy for the coerce function to fix arguments
            if (Array.isArray(attribute)) {
                errors = arguments[1];
                attribute = null;
            }
            
            return coerce.call(Derived, value, attribute, errors);
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
                data = coerce.call(Derived, data, null /* attribute */, errors);
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
    
    var attributeNames;
    if (attributes && (attributeNames = Object.keys(attributes)).length > 0) {
        // Use prototype chaining to create attribute map
        Derived.Attributes = function() {};
        
        if (Base.Attributes) {
            inherit(Derived.Attributes, Base.Attributes);
        }
        
        if (attributes) {
            var attributesPrototype = Derived.Attributes.prototype;
            attributeNames.forEach(function(name) {
                var attribute = _toAttribute(name, attributes[name]);
                
                var property = attribute.getProperty();
                
                // Put the attributes in the prototype by name and property
                attributesPrototype[name] = attribute;
                if (name !== property) {
                    attributesPrototype[property] = attribute;
                }
                
                var funcName;
                var funcSuffix = _initialUpperCase(name);
                
                
                if (attribute.getGetter() !== null) {
                    funcName = 'get' + funcSuffix;
                    classPrototype[funcName] = _generateGetter(attribute);
                }
                
                if (attribute.getSetter() !== null) {
                    funcName = 'set' + funcSuffix;
                    classPrototype[funcName] = _generateSetter(attribute);
                }
                
                if (attribute.getType() === Array) {
                    var singular;
                    if (attribute.singular) {
                        singular = _initialUpperCase(attribute.singular);
                    } else {
                        singular = funcSuffix.replace(/(ies)|(s|List|Set)$/, function(match, ies, truncate) {
                            if (ies) {
                                // cities --> city
                                return 'y';
                            } else {
                                return '';
                            }
                        });
                    }
                    
                    funcName = 'forEach' + singular;
                    classPrototype[funcName] = _generateForEach(attribute);
                    
                    if (singular === funcSuffix) {
                        funcName = 'get' + singular + 'Item';
                    } else {
                        funcName = 'get' + singular;
                    }
                    
                    classPrototype[funcName] = _generateArrayIndexGetter(attribute);
                }
            });
        }
        
        Derived.attributes = new Derived.Attributes();
        
    } else {
        Derived.Attributes = Base.Attributes;
        Derived.attributes = Base.attributes || EMPTY_ATTRIBUTES;
    }

    if (prototype) {
        Object.keys(prototype).forEach(function(key) {
            classPrototype[key] = prototype[key];
        });
    }

    return Derived;
}

Model.extend = function(config) {
    return _extend(Model, config);
};


DateType = require('./Date');
