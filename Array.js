var Model = require('./Model');

module.exports = Model.extend({
	typeName: 'array',
	wrap: false,
	coerce: function(value, options) {
        if (value == null) {
            return null;
        }

		var array;
		if (options.strict) {
			if (!Array.isArray(value)) {
				this.coercionError(value, options);
			}
		} else {
			array = Array.isArray(value) ? value : [value];
		}

		var property;
		var items;

		if ((property = options.property) && (items = property.items)) {
			var subtype = items.type;
			var coerce = subtype.coerce;


			// We might need to do some type conversion on each item in the array.
			// Even if we do type conversion we store the "raw" value in the
			// array and not the model instance
			var i = array.length;
			var origProperty = options.property;
			options.property = items;

			while(--i >= 0) {
				var item = array[i];
				if (Model.isModel(item) && (item instanceof subtype)) {
					// no conversion necessary, just store the raw value
					array[i] = item.data;
				} else {
					if (coerce) {
						// need to coerce
						item = coerce.call(subtype, item, options);
					}

					if (subtype.isWrapped()) {
						subtype.wrap(item, options);
					}

					array[i] = Model.unwrap(item);
				}
			}

			options.property = origProperty;
		}

		return array;
	}
});
