module.exports = require('./Model').extend({
	typeName: 'boolean',
	wrap: false,
	coerce: function(value, options) {
		if (options.strict) {
			// strict mode
			if (value != null && (value.constructor !== Boolean)) {
				this.coercionError(value, options);
			}
			return value;
		}

		if (value == null) {
			return value;
		} else if (value.constructor === String) {
			return (value === 'true');
		}

        return !!value;
	}
});
