module.exports = require('./Model').extend({
	typeName: 'boolean',
	wrap: false,
	coerce: function(value, property, errors) {
		if (value == null) {
			return value;
		} else if (value.constructor === String) {
			return (value === 'true');
		}

        return !!value;
	}
});
