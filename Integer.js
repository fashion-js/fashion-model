module.exports = require('./Model').extend({
	wrap: false,
	coerce: function(value, attribute, errors) {
		if (value == null) {
			return value;
		}
        
        var number = parseInt(value);

        if (isNaN(number)) {
            this.coercionError(value, attribute, errors);
        }

        return number;
	}
});
