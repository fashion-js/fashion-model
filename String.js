module.exports = require('./Model').extend({
	typeName: 'string',
	wrap: false,
	coerce: function(value, options) {
		if (options.strict) {
			// strict mode
			if ((value != null) && (value.constructor !== String)) {
				this.coercionError(value, options);
			}
			return value;
		}

		return (value == null) ? value : value.toString();
	}
});
