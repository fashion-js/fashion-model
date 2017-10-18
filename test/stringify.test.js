const test = require('ava');

const Model = require('../Model');
const Enum = require('../Enum');
const IntegerType = require('../Integer');

const Address = Model.extend({
  properties: {
    city: String,
    state: String
  }
});

const Gender = Enum.create({
  values: ['M', 'F'],
  autoUpperCase: true
});

const Member = Model.extend({
  properties: {
    email: String,
    dateCreated: Date,
    displayName: String,
    gender: Gender,
    address: Address
  }
});

test('should allow stringify', function (t) {
  const member = new Member({
    email: 'jane.doe@example.com',
    displayName: 'Jane',
    address: {
      city: 'Durham',
      state: 'NC'
    }
  });

  t.is(member.stringify(), JSON.stringify({
    email: 'jane.doe@example.com',
    displayName: 'Jane',
    address: {
      city: 'Durham',
      state: 'NC'
    }
  }));
});

test('should properly stringify an array of models', function (t) {
  const Person = Model.extend({
    properties: {
      name: String
    }
  });

  const people = [
    Person.wrap({
      name: 'John'
    }),
    Person.wrap({
      name: 'Sally'
    })
  ];

  t.is(Model.stringify(people), JSON.stringify([
    {
      name: 'John'
    },
    {
      name: 'Sally'
    }
  ]));
});

test('should allow setting of array of strings when custom "set" function is provided', function (t) {
  const Person = Model.extend({
    properties: {
      permissions: {
        type: [String],
        set: function (value, property) {
          this.data[property] = value;
        }
      }
    }
  });

  const person = new Person();
  person.setPermissions(['a', 'b', 'c']);

  t.is(person.getPermissions().length, 3);

  t.is(Model.stringify(person), JSON.stringify({
    permissions: ['a', 'b', 'c']
  }));
});

test('should properly stringify an array of models within a simple object', function (t) {
  const Person = Model.extend({
    properties: {
      name: String
    }
  });

  const people = Person.convertArray([
    {
      name: 'John'
    },
    {
      name: 'Sally'
    }
  ]);

  t.is(
    Model.stringify({
      people: people
    }),
    JSON.stringify({
      people: [
        {
          name: 'John'
        },
        {
          name: 'Sally'
        }
      ]
    })
  );
});

test('should handle stringifying models with array of Enum values', function (t) {
  const Color = Enum.create({
    values: ['red', 'green', 'blue', 'yellow']
  });

  const Palette = Model.extend({
    properties: {
      colors: [Color]
    }
  });

  // original array
  const colors = ['red', 'green', 'blue'];
  const palette = new Palette({
    colors: colors
  });

  palette.getColors().push(Color.YELLOW);

  t.is(palette.stringify(), '{"colors":["red","green","blue","yellow"]}');
});

test('should handle stringifying models with array of object values', function (t) {
  const Person = Model.extend({
    properties: {
      name: String,
      age: IntegerType
    }
  });

  const Group = Model.extend({
    properties: {
      people: [Person]
    }
  });

  // original array
  const people = [
    {
      name: 'John',
      age: 10
    },
    {
      name: 'Alice',
      age: 12
    }
  ];
  const group = new Group({
    people: people
  });

  group.getPeople().push(new Person({
    name: 'Bob',
    age: 14
  }));

  t.is(group.stringify(), '{"people":[{"name":"John","age":10},{"name":"Alice","age":12},{"name":"Bob","age":14}]}');
});
