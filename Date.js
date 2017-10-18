const isoDateFormat =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z)?$/;

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
        const a = isoDateFormat.exec(value);
        if (a) {
          let millisecond = a[7];
          millisecond = (millisecond === undefined) ? 0 : +millisecond;

          if (a[8] === 'Z') {
            // The `Z` suffix is used to indicate UTC time zone
            value = new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6], millisecond));
          } else {
            // No `Z` suffix so implicitly use time zone of this computer
            value = new Date(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6], millisecond);
          }
        } else {
          return null;
        }
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
