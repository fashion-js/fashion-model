var Model = require('./Model');

module.exports = Model.extend({
	wrap: false,
	coerce: function(value, attribute, errors) {
        if (value == null) {
            return null;
        }
        
		var array = Array.isArray(value) ? value : [value];
		
		var subtype = attribute.subtype;
		if (!subtype) {
			return array;
		}
		
        var isModelType = Model.isModelType(subtype);
		var coerce = subtype.coerce;
		
		if (isModelType || coerce) {
			// We might need to do some type conversion on each item in the array.
			// Even if we do type conversion we store the "raw" value in the
			// array and not the model instance
			var i = array.length;
			while(--i >= 0) {
				var item = array[i];
				if (Model.isModel(item) && (item instanceof subtype)) {
					// no conversion necessary, just store the raw value
					array[i] = item.data;
				} else {
					if (coerce) {
						// need to coerce
						item = coerce(item, attribute, errors);
					}
					
					if (isModelType) {
						if (subtype.isWrapped()) {
							subtype.wrap(item, errors);
						}
						
						array[i] = Model.unwrap(item);
					} else {
						array[i] = item;
					}
				}
			}
		}
		
		return array;
	}
});
