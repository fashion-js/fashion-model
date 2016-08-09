var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

var Model = require('../Model');
var IntegerType = require('../Integer');
var ObservableModel = require('../ObservableModel');

describe('init/constructor function', function() {
    it('should support init method of normal Model which will be called during construction', function() {
        var Person = Model.extend({
            init: function(data, options) {
                var name = this.getName();
                var age = this.getAge();

                if (name === undefined) {
                    this.setName('Anonymous');
                }

                if (age === undefined) {
                    this.setAge(-1);
                }

                expect(!!Model.isModel(this.constructor)).to.equal(true);
            },

            properties: {
                name: String,
                age: IntegerType
            }
        });

        var person = new Person();
        expect(person.getName()).to.equal('Anonymous');
        expect(person.getAge()).to.equal(-1);

        var person2 = new Person({
            name: 'John',
            age: 30
        });

        expect(person2.getName()).to.equal('John');
        expect(person2.getAge()).to.equal(30);
    });

    it('should support init method of ObservableModel which will be called during construction', function() {
        var Person = ObservableModel.extend({
            init: function(data, options) {
                var name = this.getName();
                var age = this.getAge();

                if (name === undefined) {
                    this.setName('Anonymous');
                }

                if (age === undefined) {
                    this.setAge(-1);
                }

                expect(!!Model.isModel(this.constructor)).to.equal(true);
            },

            properties: {
                name: String,
                age: IntegerType
            }
        });

        var person = new Person();
        expect(person.getName()).to.equal('Anonymous');
        expect(person.getAge()).to.equal(-1);

        var person2 = new Person({
            name: 'John',
            age: 30
        });

        expect(person2.getName()).to.equal('John');
        expect(person2.getAge()).to.equal(30);
    });

    it('should call init method in super types starting from the base class', function() {
        var Animal = Model.extend({
            init: function() {
                expect(this._isAnimal).to.not.exist;
                expect(this._isDog).to.not.exist;
                expect(this._isPoodle).to.not.exist;
                this._isAnimal = true;
            }
        });

        var Dog = Animal.extend({
            init: function() {
                expect(this._isAnimal).to.equal(true);
                expect(this._isDog).to.not.exist;
                expect(this._isPoodle).to.not.exist;
                this._isDog = true;
            }
        });

        var Poodle = Dog.extend({
            init: function() {
                expect(this._isAnimal).to.equal(true);
                expect(this._isDog).to.equal(true);
                expect(this._isPoodle).to.not.exist;
                this._isPoodle = true;
            }
        });

        var poodle = new Poodle();
        expect(poodle._isAnimal).to.equal(true);
        expect(poodle._isDog).to.equal(true);
        expect(poodle._isPoodle).to.equal(true);
    });
});