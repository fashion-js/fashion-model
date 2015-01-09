module.exports = require('./Model').extend({
	wrap: false,
	coerce: function(value, attribute, errors) {
		if (value == null) {
			return value;
		}
        
        if (value.constructor === Number) {
            return value;
        }
        
        var number = Number(value);
        
        if (isNaN(number)) {
            this.coercionError(value, attribute, errors);
        }
        
        return number;
	}
});
