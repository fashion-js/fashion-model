var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

var Model = require('../Model');

describe('Mixins', function () {
  it('should support mixins for types with properties', function () {
    var initCallCount;
    var onSetCallCount;

    function resetCallCounts () {
      initCallCount = 0;
      onSetCallCount = 0;
    }

    resetCallCounts();

    var myMixin = {
      id: 'myMixin',

      init: function () {
        initCallCount++;
        this.setCount(0);
      },

      onSet: function (model, event) {
        onSetCallCount++;
      },

      prototype: {
        incrementCount: function () {
          this.setCount(this.getCount() + 1);
        }
      }
    };

    var BaseItem = Model.extend({
      typeName: 'BaseItem',
      properties: {
        count: Number
      },
      mixins: [myMixin]
    });

    var DerivedItem = BaseItem.extend({
      typeName: 'DerivedItem',
      properties: {
        count: Number
      },
      mixins: [myMixin]
    });

    expect(DerivedItem._onSet.length).to.equal(1);

    var baseItem = new BaseItem();
    expect(initCallCount).to.equal(1);
    expect(onSetCallCount).to.equal(1);
    expect(baseItem.getCount()).to.equal(0);

    resetCallCounts();

    var derivedItem = new DerivedItem();
    expect(initCallCount).to.equal(1);
    expect(onSetCallCount).to.equal(1);
    expect(derivedItem.getCount()).to.equal(0);

    derivedItem.incrementCount();

    expect(onSetCallCount).to.equal(2);
    expect(derivedItem.getCount()).to.equal(1);
  });

  it('should support mixins for types without properties', function () {
    function resetCallCounts () {
    }

    resetCallCounts();

    var myMixin = {
      id: 'myMixin',

      init: function () {
        this.count = 0;
      },

      prototype: {
        incrementCount: function () {
          this.count++;
        }
      }
    };

    var BaseSimpleItem = Model.extend({
    });

    var DerivedSimpleItem = BaseSimpleItem.extend({
      mixins: [myMixin]
    });

    var AnotherDerivedSimpleItem = BaseSimpleItem.extend({
      mixins: [myMixin]
    });

    var baseSimpleItem = new BaseSimpleItem();
    expect(baseSimpleItem.incrementCount).to.equal(undefined);
    expect(baseSimpleItem.count).to.equal(undefined);

    var derivedSimpleItem = new DerivedSimpleItem();
    expect(derivedSimpleItem.incrementCount).to.not.equal(undefined);
    expect(derivedSimpleItem.count).to.equal(0);

    var anotherDerivedSimpleItem = new AnotherDerivedSimpleItem();
    expect(anotherDerivedSimpleItem.incrementCount).to.not.equal(undefined);
    expect(anotherDerivedSimpleItem.count).to.equal(0);
  });

  it('should allow properties from mixin', function () {
    var Addressable = {
      id: 'Addressable',

      initType: function (Type) {
        var typeName = Type.typeName;

        expect(typeName).to.equal('Person');

        Type.toAddressString = function (addressableOrId) {
          if (addressableOrId.constructor !== String) {
            addressableOrId = addressableOrId.getId();
          }

          return typeName + ':' + addressableOrId;
        };
      },

      init: function () {
        this.setAddressable(true);
      },

      properties: {
        addressable: Boolean
      }
    };

    var Person = Model.extend({
      typeName: 'Person',

      properties: {
        id: String
      },

      mixins: [Addressable]
    });

    expect(Person.toAddressString('123')).to.equal('Person:123');

    var person = new Person({
      id: 'john'
    });

    expect(person.getAddressable()).to.equal(true);
  });

  it('should support mixins in base class and in derived class', function () {
    var mixin1 = {
      id: 'mixin1',

      prototype: {
        hasMixin1: function () {
          return true;
        }
      }
    };

    var mixin2 = {
      id: 'mixin2',

      prototype: {
        hasMixin2: function () {
          return true;
        }
      }
    };

    var BaseSimpleItem = Model.extend({
      mixins: [mixin1]
    });

    var DerivedSimpleItem = BaseSimpleItem.extend({
      mixins: [mixin2]
    });

    var baseSimpleItem = new BaseSimpleItem();
    expect(baseSimpleItem.hasMixin1).to.exist;
    expect(baseSimpleItem.hasMixin2).to.not.exist;

    var derivedSimpleItem = new DerivedSimpleItem();
    expect(derivedSimpleItem.hasMixin1).to.exist;
    expect(derivedSimpleItem.hasMixin2).to.exist;
  });

  it('should allow mixins to add other mixins', function () {
    var Cacheable = {
      id: 'Cacheable',

      prototype: {
        isCacheable: function () {
          return true;
        }
      }
    };

    var Entity = {
      id: 'Entity',

      mixins: [
        Cacheable
      ],

      prototype: {
        isEntity: function () {
          return true;
        }
      }
    };

    var Person = Model.extend({
      mixins: [
        Entity
      ]
    });

    var person = new Person();
    expect(person.isEntity).to.exist;
    expect(person.isCacheable).to.exist;
  });
});
