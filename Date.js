function coerceDateString (value) {
  const parsed = Date.parse(value);
  return isNaN(parsed) ? null : new Date(parsed);
}

module.exports = require('./Model').extend({
  typeName: 'date',
  wrap: false,
  coerce: function (value, options) {
    if (options.strict) {
      // strict mode
      if (value != null && (value.constructor !== Date)) {
        this.coercionError(value, options);
      }
      return value;
    }

    if (value != null) {
      if (value.constructor === String) {
        return coerceDateString(value);
      } else if (value.constructor === Number) {
        value = new Date(value);
      } else if (value.constructor === Date) {
        // nothing to do
      } else {
        this.coercionError(value, options);
      }
    }
    return value;
  }
});
