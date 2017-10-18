const test = require('ava');

const Model = require('../Model');

const Address = Model.extend({
  properties: {
    city: String,
    state: String
  }
});

test('should allow unwrapping', function (t) {
  const address = new Address({
    city: 'Durham',
    state: 'NC'
  });

  const addressData = Model.unwrap(address);
  t.is(addressData.city, 'Durham');
  t.is(addressData.state, 'NC');
});

test('should allow unwrapping null/undefined', function (t) {
  t.is(Model.unwrap(null), null);
  t.is(Model.unwrap(undefined), undefined);
});

test('should allow unwrapping primitive', function (t) {
  t.is(Model.unwrap(1), 1);
  t.is(Model.unwrap('test'), 'test');
  t.false(Model.unwrap(false));
});
