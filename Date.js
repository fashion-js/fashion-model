var isoDateFormat = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/;
module.exports = require('./Model').extend({
	wrap: false,
	coerce: function(value, attribute, errors) {
		if (value != null) {
			if (value.constructor === String) {
				var a = isoDateFormat.exec(value);
				if (a) {
					value = new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]));
				} else {
					return null;
				}
			} else if (value.constructor === Number) {
				value = new Date(value);
			} else if (value.constructor === Date) {
				// nothing to do
			} else {
				this.coercionError(value, attribute, errors);
			}
		}
		return value;
	}
});
