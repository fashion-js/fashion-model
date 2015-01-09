module.exports = require('./Model').extend({
	wrap: false,
	coerce: function(value, attribute, errors) {
		return (value == null) ? value : value.toString();
	}
});
