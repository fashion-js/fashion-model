const test = require('ava');

const Model = require('../Model');

test('should support additionalProperties', function (t) {
  const IntegerType = require('../Integer');

  const Something = Model.extend({
    properties: {
      name: String,
      age: IntegerType
    },
    additionalProperties: true
  });

  let errors;

  errors = [];
  Something.wrap({
    blah: 'Blah'
  }, errors);
  t.is(errors.length, 0);
});

test('should recognize that a type has additionalProperties if extending type that has additionalProperties', function (t) {
  const Something = Model.extend({
    additionalProperties: true
  });

  const SomethingElse = Something.extend({

  });

  t.is(SomethingElse.hasProperties(), true);
  t.is(SomethingElse.additionalProperties, true);
});
