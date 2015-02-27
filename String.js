module.exports = require('./Model').extend({
	typeName: 'string',
	wrap: false,
	coerce: function(value, property, errors) {
		return (value == null) ? value : value.toString();
	}
});
