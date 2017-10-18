const test = require('ava');

var Model = require('../Model');

test('should support mixins for types with properties', function (t) {
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

  t.is(DerivedItem._onSet.length, 1);

  var baseItem = new BaseItem();
  t.is(initCallCount, 1);
  t.is(onSetCallCount, 1);
  t.is(baseItem.getCount(), 0);

  resetCallCounts();

  var derivedItem = new DerivedItem();
  t.is(initCallCount, 1);
  t.is(onSetCallCount, 1);
  t.is(derivedItem.getCount(), 0);

  derivedItem.incrementCount();

  t.is(onSetCallCount, 2);
  t.is(derivedItem.getCount(), 1);
});

test('should support mixins for types without properties', function (t) {
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
  t.is(baseSimpleItem.incrementCount, undefined);
  t.is(baseSimpleItem.count, undefined);

  var derivedSimpleItem = new DerivedSimpleItem();
  t.true(derivedSimpleItem.incrementCount !== undefined);
  t.is(derivedSimpleItem.count, 0);

  var anotherDerivedSimpleItem = new AnotherDerivedSimpleItem();
  t.true(anotherDerivedSimpleItem.incrementCount !== undefined);
  t.is(anotherDerivedSimpleItem.count, 0);
});

test('should allow properties from mixin', function (t) {
  var Addressable = {
    id: 'Addressable',

    initType: function (Type) {
      var typeName = Type.typeName;

      t.is(typeName, 'Person');

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

  t.is(Person.toAddressString('123'), 'Person:123');

  var person = new Person({
    id: 'john'
  });

  t.true(person.getAddressable());
});

test('should support mixins in base class and in derived class', function (t) {
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
  t.truthy(baseSimpleItem.hasMixin1);
  t.is(baseSimpleItem.hasMixin2, undefined);

  var derivedSimpleItem = new DerivedSimpleItem();
  t.truthy(derivedSimpleItem.hasMixin1);
  t.truthy(derivedSimpleItem.hasMixin2);
});

test('should allow mixins to add other mixins', function (t) {
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
  t.truthy(person.isEntity);
  t.truthy(person.isCacheable);
});
