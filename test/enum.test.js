const test = require('ava');

const Model = require('../Model');
const Enum = require('../Enum');

const Gender = Enum.create({
  values: ['M', 'F'],
  autoUpperCase: true
});

test('should allow enum type models', function (t) {
  t.is(Gender.wrap('F').isF(), true);

  const Person = Model.extend({
    properties: {
      gender: Gender
    }
  });

  t.throws(function () {
    (new Gender('X')).toString();
  }, Error);

  t.is(Gender.M.name(), 'M');
  t.is(Gender.F.name(), 'F');
  t.is(Gender.M.value(), 'M');
  t.is(Gender.F.value(), 'F');

  t.is(Gender.M.isM(), true);
  t.is(Gender.M.isF(), false);

  t.is(Gender.F.isM(), false);
  t.is(Gender.F.isF(), true);

  t.is(Gender.M.ordinal(), 0);
  t.is(Gender.F.ordinal(), 1);

  const person1 = new Person({
    gender: 'F'
  });

  // expect(person1.data.gender).to.equal

  t.is(person1.getGender().isF(), true);

  const person2 = new Person();
  person2.setGender('M');

  t.is(person2.getGender().isM(), true);
  t.is(person2.getGender().isF(), false);

  t.is(person2.getGender().ordinal(), 0);
});

test('should allow enum object values', function (t) {
  const Color = Enum.create({
    values: {
      red: {
        hex: '#FF0000',
        name: 'Red'
      },

      green: {
        hex: '#00FF00',
        name: 'Green'
      },

      blue: {
        hex: '#0000FF',
        name: 'Blue'
      }
    }
  });

  t.is(Color.RED.name(), 'red');
  t.is(Color.GREEN.name(), 'green');
  t.is(Color.BLUE.name(), 'blue');

  t.is(Color.RED.value().hex, '#FF0000');
  t.is(Color.RED.value().name, 'Red');

  t.is(Color.GREEN.value().hex, '#00FF00');
  t.is(Color.GREEN.value().name, 'Green');

  t.is(Color.BLUE.value().hex, '#0000FF');
  t.is(Color.BLUE.value().name, 'Blue');

  t.is(Color.red.value().hex, '#FF0000');
  t.is(Color.red.value().name, 'Red');

  t.is(Color.green.value().hex, '#00FF00');
  t.is(Color.green.value().name, 'Green');

  t.is(Color.blue.value().hex, '#0000FF');
  t.is(Color.blue.value().name, 'Blue');

  t.is(Color.red.ordinal(), 0);
  t.is(Color.green.ordinal(), 1);
});

test('should allow unwrapping an enum', function (t) {
  const Color = Enum.create({
    values: ['red', 'green', 'blue']
  });

  const Person = Model.extend({
    properties: {
      favoriteColor: Color
    }
  });

  const person = new Person();
  person.setFavoriteColor(Color.BLUE);

  t.is(person.getFavoriteColor().clean(), 'blue');

  t.is(person.unwrap().favoriteColor, Color.BLUE);

  t.deepEqual(person.unwrap(), {
    favoriteColor: Color.BLUE
  });
});

test('should allow setting an enum object value', function (t) {
  const Color = Enum.create({
    values: {
      red: {
        hex: '#FF0000',
        name: 'Red'
      },

      green: {
        hex: '#00FF00',
        name: 'Green'
      },

      blue: {
        hex: '#0000FF',
        name: 'Blue'
      }
    }
  });

  const Person = Model.extend({
    properties: {
      favoriteColor: Color
    }
  });

  const person = new Person();
  person.setFavoriteColor(Color.BLUE);

  t.is(person.unwrap().favoriteColor.value().hex, '#0000FF');
});

test('should allow short-hand syntax for defining enum', function (t) {
  const Color = Enum.create(['red', 'green', 'blue']);
  t.is(Color.red.isRed(), true);
  t.is(Color.green.isGreen(), true);
  t.is(Color.blue.isBlue(), true);
});

test('should provide helper isX methods', function (t) {
  const ContentType = Enum.create({
    values: [
      'application/json',
      'text/html',
      'something!*&special'
    ]
  });

  t.is(ContentType['text/html'].isTextHtml(), true);
  t.is(ContentType['application/json'].isApplicationJson(), true);
  t.is(ContentType['something!*&special'].isSomethingSpecial(), true);

  t.is(ContentType['text/html'].isApplicationJson(), false);
  t.is(ContentType['application/json'].isTextHtml(), false);
});

test('should handle special characters', function (t) {
  const ContentType = Enum.create({
    values: [
      'application/json',
      'text/html',
      'something!*&special'
    ]
  });

  t.is(ContentType['text/html'], ContentType.TEXT_HTML);
  t.is(ContentType['application/json'], ContentType.APPLICATION_JSON);
  t.is(ContentType['something!*&special'], ContentType.SOMETHING___SPECIAL);
});

test('should allow "apply" and "call"', function (t) {
  const Action = Enum.create({
    values: [
      'apply',
      'call',
      'plan',
      'destroy'
    ]
  });

  const Config = Model.extend({
    properties: {
      action: Action
    }
  });

  const config = new Config();
  config.setAction('apply');
  t.is(config.getAction(), Action.APPLY);
});
