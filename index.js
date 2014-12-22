var Model = require('./Model');
var Enum = require('./Enum');

exports.create = function(typeConfig) {
	return Model.extend(typeConfig);
};

exports.createEnum = function(enumConfig) {
	return Enum.create(enumConfig);
};
