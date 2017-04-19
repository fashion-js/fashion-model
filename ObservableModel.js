module.exports = require('./Model').extend({
  typeName: 'ObservableModel',
  mixins: [require('./mixins/EventEmitter')]
});
