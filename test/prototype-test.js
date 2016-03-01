var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

var Model = require('../Model');

describe('Model config prototype', function() {
    it('should support prototype', function() {
        var Person = Model.extend({
            properties: {
                displayName: String
            },

            prototype: {
                sayHello: function() {
                    return 'Hello ' + this.getDisplayName();
                }
            }
        });

        var person = new Person({
            displayName: 'John Doe'
        });

        expect(person.sayHello()).to.equal('Hello ' + person.getDisplayName());
    });
});