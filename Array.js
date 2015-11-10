var Model = require('./Model');

var ArrayType = module.exports = Model.extend({
    typeName: 'array',

    wrap: true,

    constructable: false,

    // the instanceof check for Array type values is a little different
    isInstance: function(value) {
        return value && (value.Model === ArrayType);
    },

    _initModelArray: function(rawArray, wrapped) {
        // only create second array if we need to wrap data with Model instance
        var newArray = wrapped ? new Array(rawArray.length) : rawArray;
        newArray.Model = ArrayType;
        newArray.data = rawArray;
        rawArray.$model = newArray;
        return newArray;
    },

    _convertArrayItems: function(array, ItemType, options) {
        // We might need to do some type conversion on each item in the array.
        // Even if we do type conversion we store the "raw" value in the
        // array and not the model instance
        var newArray;

        var wrapped = ItemType.isWrapped();
        newArray = ArrayType._initModelArray(array, wrapped);

        if (wrapped || ItemType.coerce) {
            // we need to either wrap or coerce each item in the array
            var i = array.length;
            while(--i >= 0) {
                var item = array[i];
                if (wrapped) {
                    // need to wrap each item and store in new array...
                    var model = newArray[i] = ItemType.wrap(item, options);

                    // store the unwrapped item in the original array
                    array[i] = Model.unwrap(model);
                } else {
                    // need to coerce...
                    // if not wrapping items then original array and new array
                    // are the same
                    array[i] = ItemType.coerce(item, options);
                }
            }
        }

        return newArray;
    },

    clean: function(value, options) {
        var property;
        var items;

        // The property that we're currently coercing is passed in via
        // options. We use the property to get information about the types
        // of each item
        if ((property = options.property) && (items = property.items)) {
            options.property = items;
            var itemType = items.type;
            if (itemType.clean) {
                var i = value.length;
                var clone = new Array(i);
                while(--i >= 0) {
                    clone[i] = itemType.clean(value[i], options);
                }
                return clone;
            }
            options.property = property;
        }

        return Model.cleanArray(value, options);
    },

    coerce: function(value, options) {
        if (value == null) {
            return value;
        }

        if (ArrayType.isInstance(value)) {
            return value;
        }

        var valueIsArray = Array.isArray(value);
        var array;
        if (options.strict) {
            if (!valueIsArray) {
                this.coercionError(value, options);
            }
        } else {
            array = valueIsArray ? value : [value];
        }

        var property;
        var items;

        // The property that we're currently coercing is passed in via
        // options. We use the property to get information about the types
        // of each item
        if ((property = options.property) && (items = property.items)) {
            Model._forProperty(items, options, function(options) {
                array = ArrayType._convertArrayItems(array, items.type, options);
            });
        } else {
            ArrayType._initModelArray(array, false);
        }

        return array;
    }
});
