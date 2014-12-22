var constantRenameRegex = /([a-z])([A-Z])|(\-)/g;

var toCamelCaseRegex = /([a-z])[_\-]([a-z])/g;

var Model = require('./Model');
var Enum = exports;

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
	var Type = Model.extend(config);
	
	var normalize;
	if (config.autoUpperCase) {
		normalize = NORMALIZE_UPPER_CASE;
	} else if (config.autoLowerCase) {
		normalize = NORMALIZE_LOWER_CASE;
	}
	
	if (!Type.coerce) {
		Type.coerce = function(value) {
			if ((value == null) || (value.constructor === Type)) {
				return value;
			}
			
			if (normalize !== undefined) {
				value = normalize(value);
			}
			
			return Type[value];
		};
	}
	
	var values = config.values;
	
	
	values.forEach(function(value) {
		var name = Enum.toConstantName(value);
		var enumValue = new Type(value);
		
		Type.prototype['is' + Enum.toTitleCase(name)] = function() {
			return (this === enumValue);
		};
		
		Type.prototype.value = function() {
			return this.data;
		};
		
		Type[value] = Type[name] = enumValue;
	});
	
	Type.preventConstruction();
	
	return Type;
};
