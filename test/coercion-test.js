var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

var Model = require('../Model');
var Enum = require('../Enum');
var ObservableModel = require('../ObservableModel');

describe('Type Coercion', function() {
    it('should support type coercion', function() {
        var NumericId = Model.extend({
            wrap: false,
            coerce: function(value) {
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

        expect(product.getId()).to.equal(123);
    });

    it('should allow allow type coercion when setting null value for enum', function() {
        var Visibility = Enum.create({
            values: ['private', 'public'],

            coerce: function(value, options) {
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

        expect(file.getVisibility()).to.equal(Visibility.private);
    });

    it('should handle converting model from one type to another', function() {
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


        expect(incomingMessage.getId()).to.equal('abc');
        expect(incomingMessage.getIncomingData().getAbc()).to.equal('testing');
        expect(outgoingMessage.getId()).to.equal('abc');
        expect(outgoingMessage.data.incomingData).to.not.exist;
    });

    it('should handle calling coerce to convert model of one type to another without unwrapping', function() {
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

            coerce: function(value, options) {
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

            initType: function(Type) {
                var addressType = Type.prototype.addressType = Type.addressType;
                if (!addressType) {
                    throw new Error('addressType is required for Addressable type');
                }
            },

            prototype: {
                getAddress: function() {
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

        expect(message.getFrom().getUri()).to.equal('abc');
        expect(message.getFrom().getType()).to.equal(AddressType.CLIENT);
    });
});

