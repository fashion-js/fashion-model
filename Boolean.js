module.exports = require('./Model').extend({
	wrap: false,
	coerce: function(value, attribute, errors) {
		if (value == null) {
			return value;
		} else if (value.constructor === String) {
			return (value === 'true');
		}
		
        return !!value;
	}
});
