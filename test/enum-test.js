var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

var Model = require('../Model');
var Enum = require('../Enum');

var Gender = Enum.create({
    values: ['M', 'F'],
    autoUpperCase: true
});

describe('Enum', function() {
    it('should allow enum type models', function() {
        expect(Gender.wrap('F').isF()).to.equal(true);

        var Person = Model.extend({
            properties: {
                gender: Gender
            }
        });

        expect(function() {
            (new Gender('X')).toString();
        }).to.throw(Error);

        expect(Gender.M.name()).to.equal('M');
        expect(Gender.F.name()).to.equal('F');
        expect(Gender.M.value()).to.equal('M');
        expect(Gender.F.value()).to.equal('F');

        expect(Gender.M.isM()).to.equal(true);
        expect(Gender.M.isF()).to.equal(false);

        expect(Gender.F.isM()).to.equal(false);
        expect(Gender.F.isF()).to.equal(true);

        expect(Gender.M.ordinal()).to.equal(0);
        expect(Gender.F.ordinal()).to.equal(1);

        var person1 = new Person({
            gender: 'F'
        });

        //expect(person1.data.gender).to.equal

        expect(person1.getGender().isF()).to.equal(true);

        var person2 = new Person();
        person2.setGender('M');

        expect(person2.getGender().isM()).to.equal(true);
        expect(person2.getGender().isF()).to.equal(false);

        expect(person2.getGender().ordinal()).to.equal(0);
    });

    it('should allow enum object values', function() {

        var Color = Enum.create({
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

        expect(Color.RED.name()).to.equal('red');
        expect(Color.GREEN.name()).to.equal('green');
        expect(Color.BLUE.name()).to.equal('blue');

        expect(Color.RED.value().hex).to.equal('#FF0000');
        expect(Color.RED.value().name).to.equal('Red');

        expect(Color.GREEN.value().hex).to.equal('#00FF00');
        expect(Color.GREEN.value().name).to.equal('Green');

        expect(Color.BLUE.value().hex).to.equal('#0000FF');
        expect(Color.BLUE.value().name).to.equal('Blue');

        expect(Color.red.value().hex).to.equal('#FF0000');
        expect(Color.red.value().name).to.equal('Red');

        expect(Color.green.value().hex).to.equal('#00FF00');
        expect(Color.green.value().name).to.equal('Green');

        expect(Color.blue.value().hex).to.equal('#0000FF');
        expect(Color.blue.value().name).to.equal('Blue');

        expect(Color.red.ordinal()).to.equal(0);
        expect(Color.green.ordinal()).to.equal(1);
    });

    it('should allow unwrapping an enum', function() {

        var Color = Enum.create({
            values: ['red', 'green', 'blue']
        });

        var Person = Model.extend({
            properties: {
                favoriteColor: Color
            }
        });

        var person = new Person();
        person.setFavoriteColor(Color.BLUE);

        expect(person.getFavoriteColor().clean()).to.equal('blue');

        expect(person.unwrap().favoriteColor).to.equal(Color.BLUE);

        expect(person.unwrap()).to.deep.equal({
            favoriteColor: Color.BLUE
        });
    });

    it('should allow setting an enum object value', function() {

        var Color = Enum.create({
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

        var Person = Model.extend({
            properties: {
                favoriteColor: Color
            }
        });


        var person = new Person();
        person.setFavoriteColor(Color.BLUE);

        expect(person.unwrap().favoriteColor.value().hex).to.equal('#0000FF');
    });

    it('should allow short-hand syntax for defining enum', function() {
        var Color = Enum.create(['red', 'green', 'blue']);
        expect(Color.red.isRed()).to.equal(true);
        expect(Color.green.isGreen()).to.equal(true);
        expect(Color.blue.isBlue()).to.equal(true);
    });
});
