const test = require('ava');

var Model = require('../Model');
var Enum = require('../Enum');
var ObservableModel = require('../ObservableModel');

test('should support type coercion', function (t) {
  var NumericId = Model.extend({
    wrap: false,
    coerce: function (value) {
      if (value != null && value.constructor !== Number) {
        value = Number(value.toString());
      }
      return value;
    }
  });

  var Product = Model.extend({
    properties: {
      id: NumericId
    }
  });

  var product = new Product({
    id: '123'
  });

  t.is(product.getId(), 123);
});

test('should allow allow type coercion when setting null value for enum', function (t) {
  var Visibility = Enum.create({
    values: ['private', 'public'],

    coerce: function (value, options) {
      if (value == null) {
        // default to private visibility
        return this.private;
      }

      // Do nothing if we want to rely on default Enum coercion
      return value;
    }
  });

  var File = Model.extend({
    properties: {
      visibility: Visibility
    }
  });

  var file = new File();
  file.setVisibility(null);

  t.is(file.getVisibility(), Visibility.private);
});

test('should handle converting model from one type to another', function (t) {
  var Blah = Model.extend({
    properties: {
      abc: String
    }
  });

  var IncomingMessage = Model.extend({
    properties: {
      id: String,
      incomingData: Blah
    }
  });

  var OutgoingMessage = Model.extend({
    properties: {
      id: String,
      outgoingData: Blah
    }
  });

  var incomingMessage = new IncomingMessage({
    id: 'abc',
    incomingData: {
      abc: 'testing'
    }
  });

  var outgoingMessage = OutgoingMessage.wrap(incomingMessage);

  t.is(incomingMessage.getId(), 'abc');
  t.is(incomingMessage.getIncomingData().getAbc(), 'testing');
  t.is(outgoingMessage.getId(), 'abc');
  t.is(outgoingMessage.data.incomingData, undefined);
});

test('should handle calling coerce to convert model of one type to another without unwrapping', function (t) {
  var AddressType = module.exports = Enum.create({
    values: [
      'Client'
    ]
  });

  var Address = Model.extend({
    properties: {
      type: AddressType,
      uri: String
    },

    coerce: function (value, options) {
      if (value == null) {
        return value;
      }

      if (value.constructor === Address) {
        return value;
      }

      if (value.addressType) {
        // value is Addressable
        return value.getAddress();
      }

      this.coercionError(value, options);
    }
  });

  var Addressable = {
    id: 'Addressable',

    initType: function (Type) {
      var addressType = Type.prototype.addressType = Type.addressType;
      if (!addressType) {
        throw new Error('addressType is required for Addressable type');
      }
    },

    prototype: {
      getAddress: function () {
        var id = this.getId();
        if (!id) {
          return null;
        }

        var address = this._address;
        if (address === undefined) {
          this._address = address = new Address();
          address.setType(this.addressType);
          address.setUri(this.getId());
        }

        return address;
      }
    }
  };

  var Client = ObservableModel.extend({
    addressType: AddressType.Client,

    mixins: [Addressable],

    properties: {
      id: String
    }
  });

  var Message = Model.extend({
    properties: {
      from: Address
    }
  });

  var client = new Client({
    id: 'abc'
  });

  var message = new Message();
  message.setFrom(client);

  t.is(message.getFrom().getUri(), 'abc');
  t.is(message.getFrom().getType(), AddressType.CLIENT);
});
