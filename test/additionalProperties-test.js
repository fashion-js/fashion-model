var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

var Model = require('../Model');

describe('Additional Properties', function() {
    it('should support additionalProperties', function() {
        var IntegerType = require('../Integer');

        var Something = Model.extend({
            properties: {
                name: String,
                age: IntegerType
            },
            additionalProperties: true
        });

        var errors;
        var something;

        errors = [];
        something = Something.wrap({
            blah: 'Blah',
        }, errors);
        expect(errors.length).to.equal(0);
    });

    it('should recognize that a type has additionalProperties if extending type that has additionalProperties', function() {
        var Something = Model.extend({
            additionalProperties: true
        });

        var SomethingElse = Something.extend({

        });

        expect(SomethingElse.hasProperties()).to.equal(true);
        expect(SomethingElse.additionalProperties).to.equal(true);
    });
});