const test = require('ava');

var Model = require('../Model');

test('should support additionalProperties', function (t) {
  var IntegerType = require('../Integer');

  var Something = Model.extend({
    properties: {
      name: String,
      age: IntegerType
    },
    additionalProperties: true
  });

  var errors;

  errors = [];
  Something.wrap({
    blah: 'Blah'
  }, errors);
  t.is(errors.length, 0);
});

test('should recognize that a type has additionalProperties if extending type that has additionalProperties', function (t) {
  var Something = Model.extend({
    additionalProperties: true
  });

  var SomethingElse = Something.extend({

  });

  t.is(SomethingElse.hasProperties(), true);
  t.is(SomethingElse.additionalProperties, true);
});
