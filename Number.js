module.exports = require('./Model').extend({
	typeName: 'number',
	wrap: false,
	coerce: function(value, property, errors) {
		if (value == null) {
			return value;
		}

        if (value.constructor === Number) {
            return value;
        }

        var number = Number(value);

        if (isNaN(number)) {
            this.coercionError(value, property, errors);
        }

        return number;
	}
});
