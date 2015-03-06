module.exports = require('./Model').extend({
	typeName: 'integer',
	wrap: false,
	coerce: function(value, options) {
		if (options.strict) {
			// strict mode
			if (value != null && (value.constructor !== Number)) {
				this.coercionError(value, options);
			}
			return value;
		}

		if (value == null) {
			return value;
		}

        var number = parseInt(value, 10);

        if (isNaN(number)) {
            this.coercionError(value, options);
        }

        return number;
	}
});
