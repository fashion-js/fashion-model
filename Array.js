const Model = require('./Model');

let ArrayType;

function flagAsArrayType (array) {
  Object.defineProperty(array, 'Model', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: ArrayType
  });
}

function _createModelArray (rawArray) {
  // only create second array if we need to wrap data with Model instance
  const newArray = new Array(rawArray.length);

  flagAsArrayType(newArray);

  return newArray;
}

function convertArrayItems (array, ItemType, options) {
  // We might need to do some type conversion on each item in the array.
  // Even if we do type conversion we store the "raw" value in the
  // array and not the model instance
  let newArray;

  newArray = _createModelArray(array);

  let wrap;
  let coerce;

  if (ItemType && ((wrap = ItemType.wrap) || (coerce = ItemType.coerce))) {
    // we need to either wrap or coerce each item in the array
    let i = array.length;
    while (--i >= 0) {
      const item = array[i];
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

  convertArrayItems,

  flagAsArrayType,

  clean: function (value, options) {
    let property;
    let items;

    // The property that we're currently coercing is passed in via
    // options. We use the property to get information about the types
    // of each item
    if ((property = options.property) && (items = property.items)) {
      options.property = items;
      const itemType = items.type;
      if (itemType.clean) {
        let i = value.length;
        const clone = new Array(i);
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

    const valueIsArray = Array.isArray(value);
    let oldArray;
    if (options.strict) {
      if (!valueIsArray) {
        this.coercionError(value, options);
        return;
      }
      oldArray = value;
    } else {
      oldArray = valueIsArray ? value : [value];
    }

    let property;
    let items;
    let newArray;

    // The property that we're currently coercing is passed in via
    // options. We use the property to get information about the types
    // of each item
    if ((property = options.property) && (items = property.items)) {
      Model._forProperty(items, options, function (options) {
        newArray = convertArrayItems(oldArray, items.type, options);
      });
    } else {
      newArray = oldArray.slice(0);
      flagAsArrayType(newArray);
    }

    return newArray;
  }
});
