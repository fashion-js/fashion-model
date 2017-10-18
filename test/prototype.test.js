const test = require('ava');

var Model = require('../Model');

test('should support prototype', function (t) {
  var Person = Model.extend({
    properties: {
      displayName: String
    },

    prototype: {
      sayHello: function () {
        return 'Hello ' + this.getDisplayName();
      }
    }
  });

  var person = new Person({
    displayName: 'John Doe'
  });

  t.is(person.sayHello(), 'Hello ' + person.getDisplayName());
});
