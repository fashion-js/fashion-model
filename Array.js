var Model = require('./Model');

var ArrayType;

function _createModelArray (rawArray) {
  // only create second array if we need to wrap data with Model instance
  var newArray = new Array(rawArray.length);
  newArray.Model = ArrayType;
  return newArray;
}

function convertArrayItems (array, ItemType, options) {
  // We might need to do some type conversion on each item in the array.
  // Even if we do type conversion we store the "raw" value in the
  // array and not the model instance
  var newArray;

  newArray = _createModelArray(array);

  var wrap;
  var coerce;

  if (ItemType && ((wrap = ItemType.wrap) || (coerce = ItemType.coerce))) {
    // we need to either wrap or coerce each item in the array
    var i = array.length;
    while (--i >= 0) {
      var item = array[i];
      if (wrap) {
        // need to wrap each item and store in new array...
        newArray[i] = wrap.call(ItemType, item, options);
      } else {
        // need to coerce...
        // if not wrapping items then original array and new array
        // are the same
        newArray[i] = coerce.call(ItemType, item, options);
      }
    }
  } else {
    newArray = array.slice(0);
  }

  return newArray;
}

ArrayType = module.exports = Model.extend({
  typeName: 'array',

  wrap: true,

  constructable: false,

  // the instanceof check for Array type values is a little different
  isInstance: function (value) {
    return value && (value.Model === ArrayType);
  },

  convertArrayItems: convertArrayItems,

  clean: function (value, options) {
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
        while (--i >= 0) {
          clone[i] = itemType.clean(value[i], options);
        }
        return clone;
      }
      options.property = property;
    }

    return Model.cleanArray(value, options);
  },

  coerce: function (value, options) {
    if (value == null) {
      return value;
    }

    if (ArrayType.isInstance(value)) {
      return value;
    }

    var valueIsArray = Array.isArray(value);
    var oldArray;
    if (options.strict) {
      if (!valueIsArray) {
        this.coercionError(value, options);
        return;
      }
      oldArray = value;
    } else {
      oldArray = valueIsArray ? value : [value];
    }

    var property;
    var items;
    var newArray;

    // The property that we're currently coercing is passed in via
    // options. We use the property to get information about the types
    // of each item
    if ((property = options.property) && (items = property.items)) {
      Model._forProperty(items, options, function (options) {
        newArray = convertArrayItems(oldArray, items.type, options);
      });
    } else {
      newArray = oldArray.slice(0);
      newArray.Model = ArrayType;
    }

    return newArray;
  }
});
