const test = require('ava');

const Model = require('../Model');

test('should support prototype', function (t) {
  const Person = Model.extend({
    properties: {
      displayName: String
    },

    prototype: {
      sayHello: function () {
        return 'Hello ' + this.getDisplayName();
      }
    }
  });

  const person = new Person({
    displayName: 'John Doe'
  });

  t.is(person.sayHello(), 'Hello ' + person.getDisplayName());
});
