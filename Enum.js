var constantRenameRegex = /([a-z])([A-Z])|([^\w])/g;

var toCamelCaseRegex = /([a-z])[_\-]([a-z])/g;

var Model = require('./Model');
var Enum = module.exports = Model.extend({});

Enum.toConstantName = function(str) {
    return str.replace(constantRenameRegex, function(match, lowerCh, upperCh, specialCh) {
        if (lowerCh) {
            return lowerCh + '_' + upperCh;
        } else {
            return '_';
        }

    }).toUpperCase();
};

Enum.toCamelCase = function(str) {
    return str.toLowerCase().replace(toCamelCaseRegex, function(match, ch1, ch2) {
        return ch1 + ch2.toUpperCase();
    });
};

Enum.toTitleCase = function(str) {
    var title = Enum.toCamelCase(str);
    return title.charAt(0).toUpperCase() + title.substring(1);
};

var NORMALIZE_LOWER_CASE = function(str) {
    return str.toLowerCase();
};

var NORMALIZE_UPPER_CASE = function(str) {
    return str.toUpperCase();
};

Enum.create = function(config) {
    var normalize;

    if (Array.isArray(config)) {
        config = {
            values: config
        };
    }

    var origCoerce = config.coerce;
    var Type;

    config.coerce = function(value, options) {
        if (origCoerce) {
            var newValue = origCoerce.call(this, value, options);
            if (newValue !== undefined) {
                value = newValue;
            }
        }

        if ((value == null) || (value.constructor === Type)) {
            return value;
        }

        if (normalize !== undefined) {
            value = normalize(value);
        }

        var enumValue = Type[value];
        if (enumValue === undefined) {
            this.coercionError(value, options);
        }
        return enumValue;
    };

    Type = Enum.extend(config);

    if (config.autoUpperCase) {
        normalize = NORMALIZE_UPPER_CASE;
    } else if (config.autoLowerCase) {
        normalize = NORMALIZE_LOWER_CASE;
    }

    var proto = Type.prototype;

    proto.value = function() {
        return this.data;
    };

    proto.name = proto.toString = function() {
        return this._name;
    };

    proto.clean = function() {
        return this._name;
    };

    var values = config.values;

    Type.names = [];
    Type.values = [];

    function createEnumValue(name, value) {
        Type.names.push(name);

        var enumValue = new Type(value);
        enumValue._name = name;

        proto['is' + Enum.toTitleCase(name)] = function() {
            return (this === enumValue);
        };

        Type[name] = Type[Enum.toConstantName(name)] = enumValue;

        Type.values.push(enumValue);

        return enumValue;
    }

    if (Array.isArray(values)) {
        values.forEach(function(value, index) {
            createEnumValue(value, value);
        });
    } else {
        for (var name in values) {
            if (values.hasOwnProperty(name)) {
                createEnumValue(name, values[name]);
            }
        }
    }


    Type.preventConstruction();

    return Type;
};
