var constantRenameRegex = /([a-z])([A-Z])|(\-)/g;

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
	if (!config.coerce) {
		config.coerce = function(value, options) {
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
	}

	var Type = Enum.extend(config);

	var normalize;
	if (config.autoUpperCase) {
		normalize = NORMALIZE_UPPER_CASE;
	} else if (config.autoLowerCase) {
		normalize = NORMALIZE_LOWER_CASE;
	}

	var values = Type.values = config.values;

	Type.prototype.value = Type.prototype.toString = function() {
		return this.data;
	};

	values.forEach(function(value, index) {
		var name = Enum.toConstantName(value);
		var enumValue = new Type(value);

		values[index] = enumValue;

		Type.prototype['is' + Enum.toTitleCase(name)] = function() {
			return (this === enumValue);
		};

		Type[value] = Type[name] = enumValue;
	});

	Type.preventConstruction();

	return Type;
};
