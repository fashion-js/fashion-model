const test = require('ava');

const Model = require('../Model');
const Enum = require('../Enum');
const ObservableModel = require('../ObservableModel');

test('should support type coercion', function (t) {
  const NumericId = Model.extend({
    wrap: false,
    coerce: function (value) {
      if (value != null && value.constructor !== Number) {
        value = Number(value.toString());
      }
      return value;
    }
  });

  const Product = Model.extend({
    properties: {
      id: NumericId
    }
  });

  const product = new Product({
    id: '123'
  });

  t.is(product.getId(), 123);
});

test('should allow allow type coercion when setting null value for enum', function (t) {
  const Visibility = Enum.create({
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

  const File = Model.extend({
    properties: {
      visibility: Visibility
    }
  });

  const file = new File();
  file.setVisibility(null);

  t.is(file.getVisibility(), Visibility.private);
});

test('should handle converting model from one type to another', function (t) {
  const Blah = Model.extend({
    properties: {
      abc: String
    }
  });

  const IncomingMessage = Model.extend({
    properties: {
      id: String,
      incomingData: Blah
    }
  });

  const OutgoingMessage = Model.extend({
    properties: {
      id: String,
      outgoingData: Blah
    }
  });

  const incomingMessage = new IncomingMessage({
    id: 'abc',
    incomingData: {
      abc: 'testing'
    }
  });

  const outgoingMessage = OutgoingMessage.wrap(incomingMessage);

  t.is(incomingMessage.getId(), 'abc');
  t.is(incomingMessage.getIncomingData().getAbc(), 'testing');
  t.is(outgoingMessage.getId(), 'abc');
  t.is(outgoingMessage.data.incomingData, undefined);
});

test('should handle calling coerce to convert model of one type to another without unwrapping', function (t) {
  const AddressType = module.exports = Enum.create({
    values: [
      'Client'
    ]
  });

  const Address = Model.extend({
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

  const Addressable = {
    id: 'Addressable',

    initType: function (Type) {
      const addressType = Type.prototype.addressType = Type.addressType;
      if (!addressType) {
        throw new Error('addressType is required for Addressable type');
      }
    },

    prototype: {
      getAddress: function () {
        const id = this.getId();
        if (!id) {
          return null;
        }

        let address = this._address;
        if (address === undefined) {
          this._address = address = new Address();
          address.setType(this.addressType);
          address.setUri(this.getId());
        }

        return address;
      }
    }
  };

  const Client = ObservableModel.extend({
    addressType: AddressType.Client,

    mixins: [Addressable],

    properties: {
      id: String
    }
  });

  const Message = Model.extend({
    properties: {
      from: Address
    }
  });

  const client = new Client({
    id: 'abc'
  });

  const message = new Message();
  message.setFrom(client);

  t.is(message.getFrom().getUri(), 'abc');
  t.is(message.getFrom().getType(), AddressType.CLIENT);
});
