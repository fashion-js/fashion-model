var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

var Model = require('../Model');
var Enum = require('../Enum');
var IntegerType = require('../Integer');

var Address = Model.extend({
    properties: {
        city: String,
        state: String
    }
});

var Gender = Enum.create({
    values: ['M', 'F'],
    autoUpperCase: true
});

var Member = Model.extend({
    properties: {
        email: String,
        dateCreated: Date,
        displayName: String,
        gender: Gender,
        address: Address
    }
});

describe('Stringify', function() {
    it('should allow stringify', function() {
        var member = new Member({
            email: 'jane.doe@example.com',
            displayName: 'Jane',
            address: {
                city: 'Durham',
                state: 'NC'
            }
        });

        expect(member.stringify()).to.equal(JSON.stringify({
            email: 'jane.doe@example.com',
            displayName: 'Jane',
            address: {
                city: 'Durham',
                state: 'NC'
            }
        }));
    });

    it('should properly stringify an array of models', function() {
        var Person = Model.extend({
            properties: {
                name: String
            }
        });

        var people = [
            Person.wrap({
                name: 'John'
            }),
            Person.wrap({
                name: 'Sally'
            })
        ];

        expect(Model.stringify(people)).to.equal(JSON.stringify([
            {
                name: 'John'
            },
            {
                name: 'Sally'
            }
        ]));
    });

    it('should allow setting of array of strings when custom "set" function is provided', function() {
        var Person = Model.extend({
            properties: {
                permissions: {
                    type: [String],
                    set: function(value, property) {
                        this.data[property] = value;
                    }
                }
            }
        });

        var person = new Person();
        person.setPermissions(['a', 'b', 'c']);

        expect(person.getPermissions().length).to.equal(3);

        expect(Model.stringify(person)).to.equal(JSON.stringify({
            permissions: ['a', 'b', 'c']
        }));
    });

    it('should properly stringify an array of models within a simple object', function() {
        var Person = Model.extend({
            properties: {
                name: String
            }
        });

        var people = Person.convertArray([
            {
                name: 'John'
            },
            {
                name: 'Sally'
            }
        ]);

        expect(Model.stringify({
            people: people
        })).to.equal(JSON.stringify({
            people: [
                {
                    name: 'John'
                },
                {
                    name: 'Sally'
                }
            ]
        }));
    });

    it('should handle stringifying models with array of Enum values', function() {
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
    });

    it('should handle stringifying models with array of object values', function() {
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

        group.getPeople().push(new Person({
            name: 'Bob',
            age: 14
        }));

        expect(group.stringify()).to.equal('{\"people\":[{\"name\":\"John\",\"age\":10},{\"name\":\"Alice\",\"age\":12},{\"name\":\"Bob\",\"age\":14}]}');
    });
});
