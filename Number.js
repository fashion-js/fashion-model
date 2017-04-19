module.exports = require('./Model').extend({
  typeName: 'number',
  wrap: false,
  coerce: function (value, options) {
    if (options.strict) {
      // strict mode
      if (value != null && (value.constructor !== Number)) {
        this.coercionError(value, options);
      }
      return value;
    }

    if (value == null) {
      return value;
    }

    if (value.constructor === Number) {
      return value;
    }

    var number = Number(value);

    if (isNaN(number)) {
      this.coercionError(value, options);
    }

    return number;
  }
});
