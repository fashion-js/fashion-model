module.exports = require('./Model').extend({
	typeName: 'integer',
	wrap: false,
	coerce: function(value, property, errors) {
		if (value == null) {
			return value;
		}

        var number = parseInt(value);

        if (isNaN(number)) {
            this.coercionError(value, property, errors);
        }

        return number;
	}
});
