module.exports = require('./Model').extend({
  typeName: 'any',
  wrap: false,
  clean: function (value) {
    return value;
  }
});
