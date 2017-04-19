var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

var Model = require('../Model');

var Address = Model.extend({
  properties: {
    city: String,
    state: String
  }
});

describe('Unwrapping', function () {
  it('should allow unwrapping', function () {
    var address = new Address({
      city: 'Durham',
      state: 'NC'
    });

    var addressData = Model.unwrap(address);
    expect(addressData.city).to.equal('Durham');
    expect(addressData.state).to.equal('NC');
  });

  it('should allow unwrapping null/undefined', function () {
    expect(Model.unwrap(null)).to.equal(null);
    expect(Model.unwrap(undefined)).to.equal(undefined);
  });

  it('should allow unwrapping primitive', function () {
    expect(Model.unwrap(1)).to.equal(1);
    expect(Model.unwrap('test')).to.equal('test');
    expect(Model.unwrap(false)).to.equal(false);
  });
});
