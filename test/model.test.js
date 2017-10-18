const test = require('ava');

var Model = require('../Model');
var Enum = require('../Enum');
var DateType = require('../Date');
var ObservableModel = require('../ObservableModel');
var ArrayType = require('../Array');
var IntegerType = require('../Integer');
var BooleanType = require('../Boolean');
var ObjectType = require('../Object');
var StringType = require('../String');
var NumberType = require('../Number');
var FunctionType = require('../Function');

test('should provide metadata', function (t) {
  var Person = Model.extend({
    properties: {
      dateOfBirth: Date
    }
  });

  var DerivedPerson = Person.extend({
  });

  var Stub = Model.extend({
  });

  var DerivedStub = Stub.extend({
    properties: {
      name: String
    }
  });

  var Simple = Stub.extend({
    properties: {}
  });

  var ToString = Model.extend({
    wrap: false,
    coerce: function (value) {
      return (value == null) ? value : value.toString();
    }
  });

  t.true(Person.hasProperties());
  t.true(Person.isWrapped());

  t.true(DerivedPerson.hasProperties());
  t.true(DerivedPerson.isWrapped());

  t.false(Stub.hasProperties());
  t.true(Stub.isWrapped());

  t.true(DerivedStub.hasProperties());
  t.true(DerivedStub.isWrapped());

  t.false(Simple.hasProperties());
  t.true(Simple.isWrapped());

  t.false(ToString.hasProperties());
  t.false(ToString.isWrapped());
});

test('should handle Date type', function (t) {
  var date = DateType.coerce('1980-02-01T00:00:00.000Z');
  t.deepEqual(date.getTime(), new Date(Date.UTC(1980, 1, 1, 0, 0, 0)).getTime());

  t.throws(function () {
    DateType.coerce(true);
  }, Error);

  var Person = Model.extend({
    properties: {
      dateOfBirth: Date
    }
  });

  var person = new Person();
  t.is(person.Model.properties.dateOfBirth.getName(), 'dateOfBirth');
  person.setDateOfBirth(new Date(1980, 1, 1));
  t.deepEqual(person.getDateOfBirth(), new Date(1980, 1, 1));
});

test('should serialize and deserialize date properly', function (t) {
  var date = new Date();

  var Ping = Model.extend({
    properties: {
      timestamp: Date
    }
  });

  var ping = new Ping({
    timestamp: date
  });

  var pong = Ping.wrap(JSON.parse(JSON.stringify(ping.clean())));

  t.is(pong.getTimestamp().getTime(), ping.getTimestamp().getTime());
});

test('should serialize and deserialize date properly without Z suffix', function (t) {
  var date = new Date('2016-04-13T18:00:00');

  var Ping = Model.extend({
    properties: {
      timestamp: Date
    }
  });

  var ping = new Ping({
    timestamp: date
  });

  t.is(ping.getTimestamp(), date);

  var pong = Ping.wrap(JSON.parse(JSON.stringify(ping.clean())));
  t.is(pong.getTimestamp().getTime(), ping.getTimestamp().getTime());
});

test('should parse dates without Z suffix', function (t) {
  var dateStr = '2016-04-13T18:00:00';
  var date = new Date(dateStr);

  var Ping = Model.extend({
    properties: {
      timestamp: Date
    }
  });

  var ping = new Ping();
  ping.setTimestamp(dateStr);

  t.is(ping.getTimestamp().getTime(), date.getTime());
});

test('should provide setters', function (t) {
  var Person = Model.extend({
    properties: {
      name: String,
      dateOfBirth: Date
    }
  });

  var person = new Person();
  person.setName('John Doe');
  person.setDateOfBirth(new Date(1980, 1, 1));

  t.is(person.getName(), 'John Doe');
  t.deepEqual(person.getDateOfBirth(), new Date(1980, 1, 1));

  var rawPerson = person.unwrap();
  t.is(rawPerson.name, 'John Doe');
  t.deepEqual(rawPerson.dateOfBirth, new Date(1980, 1, 1));
});

test('should allow wrapping existing', function (t) {
  var Person = Model.extend({
    properties: {
      name: String,
      dateOfBirth: Date
    }
  });

  var rawPerson = {
    name: 'John Doe',
    dateOfBirth: new Date(1980, 1, 1)
  };

  var person = new Person(rawPerson);
  person.setName('Jane Doe');

  // raw person should also reflect any changes
  t.is(person.getName(), 'Jane Doe');
  t.is(person.getName(), person.data.name);
  t.deepEqual(person.getDateOfBirth(), new Date(1980, 1, 1));
  t.is(person.getDateOfBirth(), person.data.dateOfBirth);
});

test('should allow custom property names', function (t) {
  var Entity = Model.extend({
    properties: {
      id: {
        type: String,
        key: '_id'
      }
    }
  });

  var Person = Entity.extend({
    properties: {
      name: String,
      dateOfBirth: Date
    }
  });

  var person = new Person({
    _id: 'test',
    name: 'John Doe',
    dateOfBirth: new Date(1980, 1, 1)
  });

  t.is(person.getId(), 'test');
});

test('should allow opaque wrapper type', function (t) {
  var Token = Model.extend({});

  var token = new Token({
    a: 1,
    b: 2
  });

  t.deepEqual(token.data, {
    a: 1,
    b: 2
  });

  var raw = token.unwrap();

  t.is(raw.a, 1);
  t.is(raw.b, 2);

  t.deepEqual(token.clean(), {
    a: 1,
    b: 2
  });
});

test('should support simplified enum array type', function (t) {
  var Color = Enum.create({
    values: ['red', 'green', 'blue']
  });

  t.is(Color.RED.clean(), 'red');
  t.is(Color.RED.value(), 'red');
  t.is(Color.RED.toString(), 'red');

  var ColorPalette = Model.extend({
    properties: {
      colors: [Color]
    }
  });

  var colorPalette = new ColorPalette({
    colors: ['red', 'green', 'blue']
  });

  var colors = [];
  colorPalette.getColors().forEach(function (color, index) {
    t.is(color.constructor, Color);
    colors[index] = color;
  });

  t.is(colors.length, 3);
  t.is(colors[0], Color.RED);
  t.is(colors[1], Color.GREEN);
  t.is(colors[2], Color.BLUE);

  t.is(Color.wrap(colorPalette.getColors()[0]), Color.RED);
  t.is(Color.wrap(colorPalette.getColors()[1]), Color.GREEN);
  t.is(Color.wrap(colorPalette.getColors()[2]), Color.BLUE);
});

test('should handle enum conversion errors', function (t) {
  var Color = Enum.create({
    values: ['red', 'green', 'blue']
  });

  t.throws(function () {
    try {
      Color.coerce('yellow');
    } catch (e) {
      t.is(e.source, Model);
      throw e;
    }
  }, Error);

  var errors;

  errors = [];
  // "yellow" is not a valid color
  Color.coerce('yellow', errors);
  t.is(errors.length, 1);

  var Shirt = Model.extend({
    properties: {
      color: Color
    }
  });

  var Person = Model.extend({
    properties: {
      shirt: Shirt
    }
  });

  errors = [];
  var person = new Person({
    shirt: {
      // "pink" is not a valid color
      color: 'pink'
    }
  }, errors);

  t.is(errors.length, 1);

  errors = [];

  // Manually add unrecognized property
  person.data.blah = true;

  var rawPerson = person.clean(errors);
  t.is(errors.length, 1);

  // color will be undefined since it is invalid
  t.deepEqual(rawPerson, {
    shirt: {}
  });
});

test('should coerce Number primitive type', function (t) {
  var Person = Model.extend({
    properties: {
      age: Number
    }
  });

  var person = new Person();
  person.setAge('10');
  t.is(person.getAge(), 10);

  t.throws(function () {
    person.setAge('asdfsadf');
  }, Error);
});

test('should coerce Boolean primitive type', function (t) {
  var Person = Model.extend({
    properties: {
      happy: Boolean
    }
  });

  var person = new Person();
  person.setHappy(1);
  t.true(person.getHappy());

  person.setHappy(0);
  t.false(person.getHappy());

  person.setHappy();
  t.is(person.getHappy(), undefined);

  person.setHappy(null);
  t.is(person.getHappy(), null);
});

test('should coerce String primitive type', function (t) {
  var Person = Model.extend({
    properties: {
      message: String
    }
  });

  var person = new Person();

  person.setMessage(true);
  t.is(person.getMessage(), 'true');

  person.setMessage('Hello');
  t.is(person.getMessage(), 'Hello');

  person.setMessage(42);
  t.is(person.getMessage(), '42');

  person.setMessage(0);
  t.is(person.getMessage(), '0');

  person.setMessage();
  t.is(person.getMessage(), undefined);

  person.setMessage(null);
  t.is(person.getMessage(), null);
});

test('should coerce array of primitives', function (t) {
  var Something = Model.extend({
    properties: {
      arrayOfBooleans: [Boolean],
      arrayOfAnything: []
    }
  });

  var something = Something.wrap({
    arrayOfBooleans: [0, 1, 'abc', -1, 'true']
  });

  var arrayOfBooleans = something.getArrayOfBooleans();
  t.false(arrayOfBooleans[0]);
  t.true(arrayOfBooleans[1]);
  t.false(arrayOfBooleans[2]);
  t.true(arrayOfBooleans[3]);
  t.true(arrayOfBooleans[4]);

  something.setArrayOfAnything([123, 'abc', true]);
  t.is(something.getArrayOfAnything()[0], 123);
  t.is(something.getArrayOfAnything()[1], 'abc');
  t.true(something.getArrayOfAnything()[2]);
});

test('should allow array as argument to wrap', function (t) {
  var Something = Model.extend({
    properties: {
      anything: Object
    }
  });

  var somethingList = Something.wrap([
    {
      anything: 123
    },
    {
      anything: 'abc'
    },
    {
      anything: true
    }
  ]);

  t.is(somethingList[0].getAnything(), 123);
  t.is(somethingList[1].getAnything(), 'abc');
  t.true(somethingList[2].getAnything());
});

test('should coerce array of enums', function (t) {
  var Color = Enum.create({
    values: ['red', 'green', 'blue']
  });

  var Person = Model.extend({
    properties: {
      favoriteColors: [Color]
    }
  });

  var person = Person.wrap({
    favoriteColors: ['red', 'green', 'blue']
  });

  var favoriteColors = person.getFavoriteColors();
  t.is(favoriteColors[0], Color.RED);
  t.is(favoriteColors[1], Color.GREEN);
  t.is(favoriteColors[2], Color.BLUE);

  t.throws(function () {
    person = Person.wrap({
      favoriteColors: ['zero']
    });
  }, Error);

  var errors = [];
  person = Person.wrap({
    favoriteColors: ['fake']
  }, errors);

  // should capture one error
  t.is(errors.length, 1);
});

test('should coerce array of models', function (t) {
  var Person = Model.extend({
    properties: {
      happy: Boolean
    }
  });

  var Something = Model.extend({
    properties: {
      people: [Person]
    }
  });

  var something = Something.wrap({
    people: [
      {
        happy: 0
      },
      {
        happy: false
      },
      {
        happy: 1
      },
      {
        happy: true
      }
    ]
  });

  var people = something.getPeople();
  t.false(people[0].getHappy());
  t.false(people[1].getHappy());
  t.true(people[2].getHappy());
  t.true(people[3].getHappy());

  t.false(Person.wrap(something.getPeople()[0]).getHappy());
  t.false(Person.wrap(something.getPeople()[1]).getHappy());
  t.true(Person.wrap(something.getPeople()[2]).getHappy());
  t.true(Person.wrap(something.getPeople()[3]).getHappy());

  var cleanSomething = Model.clean(something);
  t.deepEqual(cleanSomething, {
    people: [
      {
        happy: false
      },
      {
        happy: false
      },
      {
        happy: true
      },
      {
        happy: true
      }
    ]
  });
});

test('should support integer type', function (t) {
  var IntegerType = require('../Integer');
  var ArrayType = require('../Array');

  var Something = Model.extend({
    properties: {
      first: 'integer',
      second: IntegerType,
      firstArray: ['integer'],
      secondArray: [IntegerType]
    }
  });

  t.is(Something.getProperty('first').getType(), IntegerType);
  t.is(Something.getProperty('second').getType(), IntegerType);
  t.is(Something.getProperty('firstArray').getType(), ArrayType);
  t.is(Something.getProperty('secondArray').getType(), ArrayType);
  t.is(Something.getProperty('firstArray').getItems().type, IntegerType);
  t.is(Something.getProperty('secondArray').getItems().type, IntegerType);
});

test('should support complex object validation', function (t) {
  var IntegerType = require('../Integer');

  var Something = Model.extend({
    properties: {
      name: String,
      age: IntegerType
    }
  });

  var errors;

  errors = [];
  Something.wrap({
    name: 'John',
    age: 30
  }, errors);
  t.is(errors.length, 0);

  Something.wrap({
    name: 'John',
    age: 'blah'
  }, errors);

  t.is(errors.length, 1);

  errors = [];
  Something.wrap({
    blah: 'Blah'
  }, errors);
  t.is(errors.length, 1);
});

test('should support strict validation', function (t) {
  var IntegerType = require('../Integer');

  var Something = Model.extend({
    properties: {
      someString: String,
      someBoolean: Boolean,
      someDate: Date,
      someNumber: Number,
      someInteger: IntegerType
    },
    additionalProperties: true
  });

  var errors = [];

  Something.wrap({
    someString: 123,
    someBoolean: 1,
    someDate: 0,
    someNumber: '123',
    someInteger: '123'
  }, {
    strict: true,
    errors: errors
  });

  t.is(errors.length, 5);
});

test('should support array of array type', function (t) {
  var IntegerType = require('../Integer');
  var Item = Model.extend({
    typeName: 'Item',
    properties: {
      id: IntegerType
    }
  });

  var Something = Model.extend({
    typeName: 'Something',
    properties: {
      // short-hand for defining an Array of Array
      stuff: [[Item]],

      // long-hand for defining an Array of Array
      moreStuff: {
        type: Array,
        items: {
          type: Array,
          items: Item
        }
      }
    },
    additionalProperties: true
  });

  var errors;
  var something;

  errors = [];
  something = Something.wrap({
    stuff: [
      [{id: '1'}, {id: '2'}],
      [{id: '3'}, {id: '4'}]
    ]
  }, errors);
  t.is(errors.length, 0);

  t.deepEqual(something.clean(), {
    stuff: [
      [{id: 1}, {id: 2}],
      [{id: 3}, {id: 4}]
    ]
  });
});

test('should not wrap and unwrap Model instances if property type is declared as object', function (t) {
  var Item = Model.extend({
    properties: {
      id: String
    }
  });

  var Something = Model.extend({
    properties: {
      // Use Object as type
      item: Object
    }
  });

  var something = new Something();
  something.setItem(new Item({
    id: 'abc'
  }));

  t.is(something.getItem().getId(), 'abc');
});

test('should allow Function type', function (t) {
  var Item = Model.extend({
    properties: {
      handler: Function
    }
  });

  var item;

  t.throws(function () {
    item = new Item({
      handler: 'abc'
    });
  }, Error);

  item = new Item({
    handler: function () {}
  });

  t.is(item.getHandler().constructor, Function);
});

test('should implement isPrimitive', function (t) {
  var Item = Model.extend({
    properties: {
      handler: Function
    }
  });

  t.false(Item.isPrimitive());

  var primitives = require('../primitives');

  Object.keys(primitives).forEach(function (name) {
    var Type = primitives[name];
    t.true(Type.isPrimitive());
  });
});

test('should provide an ObservableModel that emits change event', function (t) {
  var Test = ObservableModel.extend({
    typeName: 'Test',

    properties: {
      value: Number
    }
  });

  var DerivedTest = Test.extend({
    typeName: 'DerivedTest',

    properties: {
      anotherValue: Number
    }
  });

  var emitCount = 0;

  var test = new Test();

  test.on('change', function () {
    emitCount++;
  });

  test.setValue(1);

  t.is(test.getValue(), 1);
  t.is(emitCount, 1);

  // reset emit count
  emitCount = 0;

  var derivedTest = new DerivedTest();

  derivedTest.on('change', function () {
    emitCount++;
  });

  derivedTest.setAnotherValue(2);

  t.is(derivedTest.getAnotherValue(), 2);
  t.is(emitCount, 1);
});

test('should support getters and setters', function (t) {
  var getCallCount = 0;
  var setCallCount = 0;

  var Test = Model.extend({
    properties: {
      name: {
        type: String,
        get: function (property) {
          getCallCount++;
          t.is(property.getKey(), 'name');
          t.is(property.getName(), 'name');
          return this.data[property] + '!!!';
        },

        set: function (value, property) {
          setCallCount++;
          t.is(property.getKey(), 'name');
          t.is(value, 'TEST');
          t.is(property.getName(), 'name');

          // our setter will convert to lower case
          this.data[property] = value.toLowerCase();
        }
      }
    }
  });

  var test = new Test();

  test.setName('TEST');

  // make sure setter converted to lower case...
  t.is(test.data.name, 'test');

  t.is(setCallCount, 1);
  t.is(getCallCount, 0);

  //
  t.is(test.getName(), 'test!!!');

  t.is(setCallCount, 1);
  t.is(getCallCount, 1);
});

test('should allow self type references in property type', function (t) {
  var NodeValue = Enum.create({
    values: ['a', 'b', 'c']
  });

  var Node = Model.extend({
    properties: {
      next: 'self',
      value: NodeValue
    }
  });

  var errors = [];

  var node = new Node();
  node.setNext({
    // invalid value
    value: 'd'
  }, errors);

  t.is(errors.length, 1);
  t.is(node.getNext().getValue(), undefined);

  node.setNext({
    value: 'a'
  }, errors);

  errors = [];

  t.is(errors.length, 0);
  t.is(node.getNext().getValue().toString(), 'a');
});

test('should allow self array type references in property type (version 1)', function (t) {
  var TreeNodeValue = Enum.create({
    values: ['a', 'b', 'c']
  });

  var TreeNode = Model.extend({
    properties: {
      children: 'self[]',
      value: TreeNodeValue
    }
  });

  var errors = [];

  var node = new TreeNode();
  node.setChildren([
    {
      value: 'a'
    },
    {
      value: 'b'
    },
    {
      value: 'c'
    },
    {
      // invalid value
      value: 'd'
    }
  ], errors);

  t.is(errors.length, 1);
  t.is(TreeNode.wrap(node.getChildren()[0]).getValue().toString(), 'a');
  t.is(TreeNode.wrap(node.getChildren()[1]).getValue().toString(), 'b');
  t.is(TreeNode.wrap(node.getChildren()[2]).getValue().toString(), 'c');
  t.is(TreeNode.wrap(node.getChildren()[3]).getValue(), undefined);
});

test('should allow self array type references in property type (version 2)', function (t) {
  var TreeNodeValue = Enum.create({
    values: ['a', 'b', 'c']
  });

  var TreeNode = Model.extend({
    properties: {
      children: ['self'],
      value: TreeNodeValue
    }
  });

  var errors = [];

  var node = new TreeNode();
  node.setChildren([
    {
      value: 'a'
    },
    {
      value: 'b'
    },
    {
      value: 'c'
    },
    {
      // invalid value
      value: 'd'
    }
  ], errors);

  t.is(errors.length, 1);
  t.is(TreeNode.wrap(node.getChildren()[0]).getValue().toString(), 'a');
  t.is(TreeNode.wrap(node.getChildren()[1]).getValue().toString(), 'b');
  t.is(TreeNode.wrap(node.getChildren()[2]).getValue().toString(), 'c');
  t.is(TreeNode.wrap(node.getChildren()[3]).getValue(), undefined);
});

test('should handle wrapping array values', function (t) {
  var Color = Enum.create({
    values: ['red', 'green', 'blue', 'yellow']
  });

  // original array
  var colors = ['red', 'GREEN', 'blue'];
  var newColors = Color.convertArray(colors);

  // values in original array are untouched
  t.is(colors[0], 'red');
  t.is(colors[1], 'GREEN');
  t.is(colors[2], 'blue');

  // values in new array are model instances
  t.is(newColors[0], Color.RED);
  t.is(newColors[1], Color.GREEN);
  t.is(newColors[2], Color.BLUE);
});

test('should handle converting simple type array values', function (t) {
  var values = [0, 1];
  var newValues = BooleanType.convertArray(values);

  t.true(values !== newValues);

  // old array is not modified
  t.is(values[0], 0);
  t.is(values[1], 1);

  // values in original array are coerced
  t.false(newValues[0]);
  t.true(newValues[1]);
});

test('should handle converting Object type array values', function (t) {
  var v0 = {a: 1};
  var v1 = {a: 2};

  var values = [v0, v1];
  var newValues = ObjectType.convertArray(values);

  t.true(values !== newValues);
  t.deepEqual(values, newValues);
});

test('should handle null/undefined when wrapping primitives', function (t) {
  t.is(BooleanType.wrap(null), null);
  t.is(BooleanType.wrap(undefined), undefined);
  t.is(IntegerType.wrap(null), null);
  t.is(IntegerType.wrap(undefined), undefined);
  t.is(StringType.wrap(null), null);
  t.is(StringType.wrap(undefined), undefined);
  t.is(NumberType.wrap(null), null);
  t.is(NumberType.wrap(undefined), undefined);
  t.is(ArrayType.wrap(null), null);
  t.is(ArrayType.wrap(undefined), undefined);
  t.is(DateType.wrap(null), null);
  t.is(DateType.wrap(undefined), undefined);
  t.is(FunctionType.wrap(null), null);
  t.is(FunctionType.wrap(undefined), undefined);
});

test('should handle wrapping an object that was created with a null prototype', function (t) {
  var Person = Model.extend({
    properties: {
      name: String
    }
  });

  var data = Object.create(null);
  data.name = 'Austin';

  var errors = [];
  var person = Person.wrap(data, errors);

  t.is(errors.length, 0);
  t.is(person.getName(), 'Austin');
});

test('should handle wrapping property value whose type is Array', function (t) {
  var Color = Enum.create({
    values: ['red', 'green', 'blue', 'yellow']
  });

  var Palette = Model.extend({
    properties: {
      colors: [Color]
    }
  });

  // original array
  var colors = ['red', 'GREEN', 'blue'];
  var palette = new Palette({
    colors: colors
  });

  // values in original array are not modified
  t.is(colors[0], 'red');
  t.is(colors[1], 'GREEN');
  t.is(colors[2], 'blue');

  t.is(palette.data.colors[0], Color.RED);
  t.is(palette.data.colors[1], Color.GREEN);
  t.is(palette.data.colors[2], Color.BLUE);

  t.is(palette.getColors(), palette.getColors());

  t.is(palette.getColors()[0], Color.RED);
  t.is(palette.getColors()[1], Color.GREEN);
  t.is(palette.getColors()[2], Color.BLUE);

  palette.addToColors('yellow');

  t.is(palette.getColors()[3], Color.YELLOW);
});

test('should handle cleaning model with arrays', function (t) {
  var Color = Enum.create({
    values: ['red', 'green', 'blue', 'yellow']
  });

  var Palette = Model.extend({
    properties: {
      colors: [Color]
    }
  });

  // original array
  var colors = ['red', 'green', 'blue'];
  var palette = new Palette({
    colors: colors
  });

  palette.getColors().push(Color.YELLOW);

  t.is(palette.stringify(), '{"colors":["red","green","blue","yellow"]}');

  t.is(palette.getColors().length, 4);
  t.is(palette.getColors()[0], Color.RED);
  t.is(palette.getColors()[1], Color.GREEN);
  t.is(palette.getColors()[2], Color.BLUE);
  t.is(palette.getColors()[3], Color.YELLOW);

  t.deepEqual(palette.clean(), {
    colors: ['red', 'green', 'blue', 'yellow']
  });
});

test('should addToProperty method for modifying arrays of primitive types', function (t) {
  var Collection = Model.extend({
    properties: {
      items: [Object]
    }
  });

  // original array
  var items = [
    'abc',
    'def'
  ];
  var collection = new Collection({
    items: items
  });

  t.is(collection.getItems().length, 2);
  t.is(collection.getItems()[0], 'abc');
  t.is(collection.getItems()[1], 'def');

  t.is(collection.stringify(), '{"items":["abc","def"]}');

  collection.addToItems('123');

  t.is(collection.getItems().length, 3);

  t.is(collection.stringify(), '{"items":["abc","def","123"]}');

  t.deepEqual(collection.clean(), {
    items: [
      'abc',
      'def',
      '123'
    ]
  });
});

test('should addToProperty method for modifying arrays of models', function (t) {
  var Person = Model.extend({
    properties: {
      name: String,
      age: IntegerType
    }
  });

  var Group = Model.extend({
    properties: {
      people: [Person]
    }
  });

  // original array
  var people = [
    {
      name: 'John',
      age: 10
    },
    {
      name: 'Alice',
      age: 12
    }
  ];
  var group = new Group({
    people: people
  });

  group.addToPeople({
    name: 'Bob',
    age: 14
  });

  t.is(group.stringify(), '{"people":[{"name":"John","age":10},{"name":"Alice","age":12},{"name":"Bob","age":14}]}');

  t.deepEqual(group.clean(), {
    people: [
      {
        name: 'John',
        age: 10
      },
      {
        name: 'Alice',
        age: 12
      },
      {
        name: 'Bob',
        age: 14
      }
    ]
  });
});
