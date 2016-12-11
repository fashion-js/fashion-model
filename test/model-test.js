var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

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

describe('Model' , function() {
    it('should provide metadata', function() {
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
            coerce: function(value) {
                return (value == null) ? value : value.toString();
            }
        });

        expect(Person.hasProperties()).to.equal(true);
        expect(Person.isWrapped()).to.equal(true);

        expect(DerivedPerson.hasProperties()).to.equal(true);
        expect(DerivedPerson.isWrapped()).to.equal(true);

        expect(Stub.hasProperties()).to.equal(false);
        expect(Stub.isWrapped()).to.equal(true);

        expect(DerivedStub.hasProperties()).to.equal(true);
        expect(DerivedStub.isWrapped()).to.equal(true);

        expect(Simple.hasProperties()).to.equal(false);
        expect(Simple.isWrapped()).to.equal(true);

        expect(ToString.hasProperties()).to.equal(false);
        expect(ToString.isWrapped()).to.equal(false);
    });

    it('should handle Date type', function() {
        var date = DateType.coerce('1980-02-01T00:00:00.000Z');
        expect(date.getTime()).to.deep.equal(new Date(Date.UTC(1980, 1, 1, 0, 0, 0)).getTime());

        expect(function() {
            DateType.coerce(true);
        }).to.throw();

        var Person = Model.extend({
            properties: {
                dateOfBirth: Date
            }
        });

        var person = new Person();
        expect(person.Model.properties.dateOfBirth.getName()).to.equal('dateOfBirth');
        person.setDateOfBirth(new Date(1980, 1, 1));
        expect(person.getDateOfBirth()).to.deep.equal(new Date(1980, 1, 1));
    });

    it('should serialize and deserialize date properly', function() {
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

        expect(pong.getTimestamp().getTime()).to.equal(ping.getTimestamp().getTime());
    });

    it('should serialize and deserialize date properly without Z suffix', function() {
        var date = new Date('2016-04-13T18:00:00');

        var Ping = Model.extend({
            properties: {
                timestamp: Date
            }
        });

        var ping = new Ping({
            timestamp: date
        });

        expect(ping.getTimestamp()).to.equal(date);

        var pong = Ping.wrap(JSON.parse(JSON.stringify(ping.clean())));
        expect(pong.getTimestamp().getTime()).to.equal(ping.getTimestamp().getTime());
    });

    it('should parse dates without Z suffix', function() {
        var dateStr = '2016-04-13T18:00:00';
        var date = new Date(dateStr);

        var Ping = Model.extend({
            properties: {
                timestamp: Date
            }
        });

        var ping = new Ping();
        ping.setTimestamp(dateStr);

        expect(ping.getTimestamp().getTime()).to.equal(date.getTime());
    });

    it('should provide setters', function() {
        var Person = Model.extend({
            properties: {
                name: String,
                dateOfBirth: Date
            }
        });

        var person = new Person();
        person.setName('John Doe');
        person.setDateOfBirth(new Date(1980, 1, 1));

        expect(person.getName()).to.equal('John Doe');
        expect(person.getDateOfBirth()).to.deep.equal(new Date(1980, 1, 1));



        var rawPerson = person.unwrap();
        expect(rawPerson.name).to.equal('John Doe');
        expect(rawPerson.dateOfBirth).to.deep.equal(new Date(1980, 1, 1));
    });

    it('should allow wrapping existing', function() {
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
        expect(person.getName()).to.equal('Jane Doe');
        expect(person.getName()).to.equal(person.data.name);
        expect(person.getDateOfBirth()).to.deep.equal(new Date(1980, 1, 1));
        expect(person.getDateOfBirth()).to.equal(person.data.dateOfBirth);
    });

    it('should allow custom property names', function() {
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

        expect(person.getId()).to.equal('test');
    });

    it('should allow opaque wrapper type', function() {
        var Token = Model.extend({});

        var token = new Token({
            a: 1,
            b: 2
        });

        expect(token.data).to.deep.equal({
            a: 1,
            b: 2
        });

        var raw = token.unwrap();

        expect(raw.a).to.equal(1);
        expect(raw.b).to.equal(2);

        expect(token.clean()).to.deep.equal({
            a: 1,
            b: 2
        });
    });

    it('should support simplified enum array type', function() {

        var Color = Enum.create({
            values: ['red', 'green', 'blue']
        });

        expect(Color.RED.clean()).to.equal('red');
        expect(Color.RED.value()).to.equal('red');
        expect(Color.RED.toString()).to.equal('red');

        var ColorPalette = Model.extend({
            properties: {
                colors: [Color]
            }
        });

        var colorPalette = new ColorPalette({
            colors: ['red', 'green', 'blue']
        });

        var colors = [];
        colorPalette.getColors().forEach(function(color, index) {
            expect(color.constructor).to.equal(Color);
            colors[index] = color;
        });

        expect(colors.length).to.equal(3);
        expect(colors[0]).to.equal(Color.RED);
        expect(colors[1]).to.equal(Color.GREEN);
        expect(colors[2]).to.equal(Color.BLUE);

        expect(Color.wrap(colorPalette.getColors()[0])).to.equal(Color.RED);
        expect(Color.wrap(colorPalette.getColors()[1])).to.equal(Color.GREEN);
        expect(Color.wrap(colorPalette.getColors()[2])).to.equal(Color.BLUE);
    });

    it('should handle enum conversion errors', function() {
        var Color = Enum.create({
            values: ['red', 'green', 'blue']
        });

        expect(function() {
            try {
                Color.coerce('yellow');
            } catch(e) {
                expect(e.source).to.equal(Model);
                throw e;
            }
        }).to.throw(Error);

        var errors;

        errors = [];
        // "yellow" is not a valid color
        Color.coerce('yellow', errors);
        expect(errors.length).to.equal(1);

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


        expect(errors.length).to.equal(1);

        errors = [];

        // Manually add unrecognized property
        person.data.blah = true;

        var rawPerson = person.clean(errors);
        expect(errors.length).to.equal(1);

        // color will be undefined since it is invalid
        expect(rawPerson).to.deep.equal({
            shirt: {}
        });
    });

    it('should coerce Number primitive type', function() {
        var Person = Model.extend({
            properties: {
                age: Number
            }
        });

        var person = new Person();
        person.setAge('10');
        expect(person.getAge()).to.equal(10);

        expect(function() {
            person.setAge('asdfsadf');
        }).to.throw(Error);
    });

    it('should coerce Boolean primitive type', function() {
        var Person = Model.extend({
            properties: {
                happy: Boolean
            }
        });

        var person = new Person();
        person.setHappy(1);
        expect(person.getHappy()).to.equal(true);

        person.setHappy(0);
        expect(person.getHappy()).to.equal(false);

        person.setHappy();
        expect(person.getHappy()).to.equal(undefined);

        person.setHappy(null);
        expect(person.getHappy()).to.equal(null);
    });

    it('should coerce String primitive type', function() {
        var Person = Model.extend({
            properties: {
                message: String
            }
        });

        var person = new Person();

        person.setMessage(true);
        expect(person.getMessage()).to.equal('true');

        person.setMessage('Hello');
        expect(person.getMessage()).to.equal('Hello');

        person.setMessage(42);
        expect(person.getMessage()).to.equal('42');

        person.setMessage(0);
        expect(person.getMessage()).to.equal('0');

        person.setMessage();
        expect(person.getMessage()).to.equal(undefined);

        person.setMessage(null);
        expect(person.getMessage()).to.equal(null);
    });

    it('should coerce array of primitives', function() {
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
        expect(arrayOfBooleans[0]).to.equal(false);
        expect(arrayOfBooleans[1]).to.equal(true);
        expect(arrayOfBooleans[2]).to.equal(false);
        expect(arrayOfBooleans[3]).to.equal(true);
        expect(arrayOfBooleans[4]).to.equal(true);

        something.setArrayOfAnything([123, 'abc', true]);
        expect(something.getArrayOfAnything()[0]).to.equal(123);
        expect(something.getArrayOfAnything()[1]).to.equal('abc');
        expect(something.getArrayOfAnything()[2]).to.equal(true);
    });

    it('should allow array as argument to wrap', function() {
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

        expect(somethingList[0].getAnything()).to.equal(123);
        expect(somethingList[1].getAnything()).to.equal('abc');
        expect(somethingList[2].getAnything()).to.equal(true);
    });

    it('should coerce array of enums', function() {
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
        expect(favoriteColors[0]).to.equal(Color.RED);
        expect(favoriteColors[1]).to.equal(Color.GREEN);
        expect(favoriteColors[2]).to.equal(Color.BLUE);

        expect(function() {
            person = Person.wrap({
                favoriteColors: ['zero']
            });
        }).to.throw(Error);

        var errors = [];
        person = Person.wrap({
            favoriteColors: ['fake']
        }, errors);

        // should capture one error
        expect(errors.length).to.equal(1);
    });

    it('should coerce array of models', function() {
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
        expect(people[0].getHappy()).to.equal(false);
        expect(people[1].getHappy()).to.equal(false);
        expect(people[2].getHappy()).to.equal(true);
        expect(people[3].getHappy()).to.equal(true);


        expect(Person.wrap(something.getPeople()[0]).getHappy()).to.equal(false);
        expect(Person.wrap(something.getPeople()[1]).getHappy()).to.equal(false);
        expect(Person.wrap(something.getPeople()[2]).getHappy()).to.equal(true);
        expect(Person.wrap(something.getPeople()[3]).getHappy()).to.equal(true);

        var cleanSomething = Model.clean(something);
        expect(cleanSomething).to.deep.equal({
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

    it('should support integer type', function() {
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

        expect(Something.getProperty('first').getType()).to.equal(IntegerType);
        expect(Something.getProperty('second').getType()).to.equal(IntegerType);
        expect(Something.getProperty('firstArray').getType()).to.equal(ArrayType);
        expect(Something.getProperty('secondArray').getType()).to.equal(ArrayType);
        expect(Something.getProperty('firstArray').getItems().type).to.equal(IntegerType);
        expect(Something.getProperty('secondArray').getItems().type).to.equal(IntegerType);
    });

    it('should support complex object validation', function() {
        var IntegerType = require('../Integer');

        var Something = Model.extend({
            properties: {
                name: String,
                age: IntegerType
            }
        });

        var errors;
        var something;

        errors = [];
        something = Something.wrap({
            name: 'John',
            age: 30
        }, errors);
        expect(errors.length).to.equal(0);

        something = Something.wrap({
            name: 'John',
            age: 'blah'
        }, errors);

        expect(errors.length).to.equal(1);

        errors = [];
        something = Something.wrap({
            blah: 'Blah',
        }, errors);
        expect(errors.length).to.equal(1);
    });

    it('should support strict validation', function() {
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

        expect(errors.length).to.equal(5);
    });

    it('should support array of array type', function() {
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
        expect(errors.length).to.equal(0);

        expect(something.clean()).to.deep.equal({
            stuff: [
                [{id: 1}, {id: 2}],
                [{id: 3}, {id: 4}]
            ]
        });
    });

    it('should not wrap and unwrap Model instances if property type is declared as object', function() {
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

        expect(something.getItem().getId()).to.equal('abc');
    });

    it('should allow Function type', function() {
        var Item = Model.extend({
            properties: {
                handler: Function
            }
        });

        var item;

        expect(function() {
            item = new Item({
                handler: 'abc'
            });
        }).to.throw();

        item = new Item({
            handler: function() {}
        });

        expect(item.getHandler().constructor).to.equal(Function);
    });

    it('should implement isPrimitive', function() {
        var Item = Model.extend({
            properties: {
                handler: Function
            }
        });

        expect(Item.isPrimitive()).to.equal(false);

        var primitives = require('../primitives');

        Object.keys(primitives).forEach(function(name) {
            var Type = primitives[name];
            expect(Type.isPrimitive()).to.equal(true);
        });
    });

    it('should provide an ObservableModel that emits change event', function() {
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

        test.on('change', function() {
            emitCount++;
        });

        test.setValue(1);

        expect(test.getValue()).to.equal(1);
        expect(emitCount).to.equal(1);

        // reset emit count
        emitCount = 0;

        var derivedTest = new DerivedTest();


        derivedTest.on('change', function() {
            emitCount++;
        });

        derivedTest.setAnotherValue(2);

        expect(derivedTest.getAnotherValue()).to.equal(2);
        expect(emitCount).to.equal(1);
    });

    it('should support getters and setters', function() {
        var getCallCount = 0;
        var setCallCount = 0;

        var Test = Model.extend({
            properties: {
                name: {
                    type: String,
                    get: function(property) {
                        getCallCount++;
                        expect(property.getKey()).to.equal('name');
                        expect(property.getName()).to.equal('name');
                        return this.data[property] + '!!!';
                    },

                    set: function(value, property) {
                        setCallCount++;
                        expect(property.getKey()).to.equal('name');
                        expect(value).to.equal('TEST');
                        expect(property.getName()).to.equal('name');

                        // our setter will convert to lower case
                        this.data[property] = value.toLowerCase();
                    }
                }
            }
        });

        var test = new Test();

        test.setName('TEST');

        // make sure setter converted to lower case...
        expect(test.data.name).to.equal('test');

        expect(setCallCount).to.equal(1);
        expect(getCallCount).to.equal(0);

        //
        expect(test.getName()).to.equal('test!!!');

        expect(setCallCount).to.equal(1);
        expect(getCallCount).to.equal(1);
    });

    it('should allow self type references in property type', function() {
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

        expect(errors.length).to.equal(1);
        expect(node.getNext().getValue()).to.equal(undefined);

        node.setNext({
            value: 'a'
        }, errors);

        errors = [];

        expect(errors.length).to.equal(0);
        expect(node.getNext().getValue().toString()).to.equal('a');
    });

    it('should allow self array type references in property type (version 1)', function() {
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

        expect(errors.length).to.equal(1);
        expect(TreeNode.wrap(node.getChildren()[0]).getValue().toString()).to.equal('a');
        expect(TreeNode.wrap(node.getChildren()[1]).getValue().toString()).to.equal('b');
        expect(TreeNode.wrap(node.getChildren()[2]).getValue().toString()).to.equal('c');
        expect(TreeNode.wrap(node.getChildren()[3]).getValue()).to.equal(undefined);
    });

    it('should allow self array type references in property type (version 2)', function() {
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

        expect(errors.length).to.equal(1);
        expect(TreeNode.wrap(node.getChildren()[0]).getValue().toString()).to.equal('a');
        expect(TreeNode.wrap(node.getChildren()[1]).getValue().toString()).to.equal('b');
        expect(TreeNode.wrap(node.getChildren()[2]).getValue().toString()).to.equal('c');
        expect(TreeNode.wrap(node.getChildren()[3]).getValue()).to.equal(undefined);
    });

    it('should handle wrapping array values', function() {
        var Color = Enum.create({
            values: ['red', 'green', 'blue', 'yellow']
        });

        // original array
        var colors = ['red', 'GREEN', 'blue'];
        var newColors = Color.convertArray(colors);

        // values in original array are untouched
        expect(colors[0]).to.equal('red');
        expect(colors[1]).to.equal('GREEN');
        expect(colors[2]).to.equal('blue');

        // values in new array are model instances
        expect(newColors[0]).to.equal(Color.RED);
        expect(newColors[1]).to.equal(Color.GREEN);
        expect(newColors[2]).to.equal(Color.BLUE);
    });

    it('should handle converting simple type array values', function() {
        var values = [0, 1];
        var newValues = BooleanType.convertArray(values);

        expect(values !== newValues);

        // old array is not modified
        expect(values[0]).to.equal(0);
        expect(values[1]).to.equal(1);

        // values in original array are coerced
        expect(newValues[0]).to.equal(false);
        expect(newValues[1]).to.equal(true);
    });

    it('should handle converting Object type array values', function() {
        var v0 = {a: 1};
        var v1 = {a: 2};

        var values = [v0, v1];
        var newValues = ObjectType.convertArray(values);

        expect(values === newValues);

        // values in original array are coerced
        expect(values[0]).to.equal(v0);
        expect(values[1]).to.equal(v1);
    });

    it('should handle null/undefined when wrapping primitives', function() {
        expect(BooleanType.wrap(null)).to.equal(null);
        expect(BooleanType.wrap(undefined)).to.equal(undefined);
        expect(IntegerType.wrap(null)).to.equal(null);
        expect(IntegerType.wrap(undefined)).to.equal(undefined);
        expect(StringType.wrap(null)).to.equal(null);
        expect(StringType.wrap(undefined)).to.equal(undefined);
        expect(NumberType.wrap(null)).to.equal(null);
        expect(NumberType.wrap(undefined)).to.equal(undefined);
        expect(ArrayType.wrap(null)).to.equal(null);
        expect(ArrayType.wrap(undefined)).to.equal(undefined);
        expect(DateType.wrap(null)).to.equal(null);
        expect(DateType.wrap(undefined)).to.equal(undefined);
        expect(FunctionType.wrap(null)).to.equal(null);
        expect(FunctionType.wrap(undefined)).to.equal(undefined);
    });

    it('should handle wrapping an object that was created with a null prototype', function() {
        var Person = Model.extend({
            properties: {
                name: String
            }
        });

        var data = Object.create(null);
        data.name = 'Austin';

        var errors = [];
        var person = Person.wrap(data, errors);

        expect(errors.length).to.equal(0);
        expect(person.getName()).to.equal('Austin');
    });

    it('should handle wrapping property value whose type is Array', function() {
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
        expect(colors[0]).to.equal('red');
        expect(colors[1]).to.equal('GREEN');
        expect(colors[2]).to.equal('blue');


        expect(palette.data.colors[0]).to.equal(Color.RED);
        expect(palette.data.colors[1]).to.equal(Color.GREEN);
        expect(palette.data.colors[2]).to.equal(Color.BLUE);

        expect(palette.getColors()).to.equal(palette.getColors());

        expect(palette.getColors()[0]).to.equal(Color.RED);
        expect(palette.getColors()[1]).to.equal(Color.GREEN);
        expect(palette.getColors()[2]).to.equal(Color.BLUE);

        palette.addToColors('yellow');

        expect(palette.getColors()[3]).to.equal(Color.YELLOW);
    });

    it('should handle cleaning model with arrays', function() {
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

        expect(palette.stringify()).to.equal('{\"colors\":[\"red\",\"green\",\"blue\",\"yellow\"]}');

        expect(palette.getColors().length).to.equal(4);
        expect(palette.getColors()[0]).to.equal(Color.RED);
        expect(palette.getColors()[1]).to.equal(Color.GREEN);
        expect(palette.getColors()[2]).to.equal(Color.BLUE);
        expect(palette.getColors()[3]).to.equal(Color.YELLOW);

        expect(palette.clean()).to.deep.equal({
            colors: ['red', 'green', 'blue', 'yellow']
        });
    });

    it('should addToProperty method for modifying arrays of primitive types', function() {
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

        expect(collection.getItems().length).to.equal(2);
        expect(collection.getItems()[0]).to.equal('abc');
        expect(collection.getItems()[1]).to.equal('def');

        expect(collection.stringify()).to.equal('{\"items\":[\"abc\",\"def\"]}');

        collection.addToItems('123');

        expect(collection.getItems().length).to.equal(3);

        expect(collection.stringify()).to.equal('{\"items\":[\"abc\",\"def\",\"123\"]}');

        expect(collection.clean()).to.deep.equal({
            items: [
                'abc',
                'def',
                '123'
            ]
        });
    });

    it('should addToProperty method for modifying arrays of models', function() {
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

        expect(group.stringify()).to.equal('{\"people\":[{\"name\":\"John\",\"age\":10},{\"name\":\"Alice\",\"age\":12},{\"name\":\"Bob\",\"age\":14}]}');

        expect(group.clean()).to.deep.equal({
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
});
