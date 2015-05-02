module.exports = require('./Model').extend({
	typeName: 'function',
	wrap: false,
	coerce: function(value, options) {
		if (value != null) {
			if (value.constructor !== Function) {
				this.coercionError(value, options, 'Value is not a function');
			}
		}

		return value;
	}
});