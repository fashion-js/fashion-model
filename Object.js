module.exports = require('./Model').extend({
  typeName: 'object',
  wrap: false,

  coerce: function (value, options) {
    if ((value == null) || (typeof value === 'object')) {
      return value;
    }

    this.coercionError(value, options);
  }
});
