var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

var Model = require('../Model');
var Enum = require('../Enum');
var ArrayType = require('../Array');

describe('Cleaning', function() {
    it('should deep clean', function() {
        var Gender = Enum.create({
            values: {
                MALE: {
                    code: 'M'
                },
                FEMALE: {
                    code: 'F'
                }
            }
        });

        var Person = Model.extend({
            properties: {
                displayName: String,
                gender: Gender
            }
        });



        var wrapper = {
            something: {
                person: new Person({
                    displayName: 'John Doe',
                    gender: Gender.MALE
                }),
                anotherPerson: Person.unwrap(new Person({
                    displayName: 'Jane Doe',
                    gender: Gender.FEMALE
                }))
            },
            array: [1, 2, 3],
            female: Gender.FEMALE
        };

        var cleaned = Model.clean(wrapper);

        expect(wrapper.something.person.getDisplayName()).to.equal('John Doe');

        expect(cleaned).to.deep.equal({
            something: {
                person: {
                    displayName: 'John Doe',
                    gender: 'MALE'
                },
                anotherPerson: {
                    displayName: 'Jane Doe',
                    gender: 'FEMALE'
                }
            },
            array: [1, 2, 3],
            female: 'FEMALE'
        });
    });

    it('should allow cleaning of "hidden" model properties from raw data', function() {
        var Entity = Model.extend({
            properties: {
                id: {
                    type: String,
                    key: '_id'
                }
            }
        });

        var AddressType = Enum.create({
            values: {
                'home': {
                    title: 'Home'
                },

                'work': {
                    title: 'work'
                }
            }
        });

        var Address = Model.extend({
            properties: {
                city: String,
                state: String,
                type: AddressType
            }
        });

        var Person = Entity.extend({
            properties: {
                name: String,
                dateOfBirth: Date,
                address: Address
            }
        });

        var person = new Person({
            _id: 'test',
            name: 'John Doe',
            dateOfBirth: new Date(1980, 1, 1),
            address: new Address({
                city: 'Durham',
                state: 'NC',
                type: 'work'
            })
        });

        expect(Model.clean(person)).to.deep.equal({
            _id: 'test',
            name: 'John Doe',
            dateOfBirth: new Date(1980, 1, 1),
            address: {
                city: 'Durham',
                state: 'NC',
                type: 'work'
            }
        });
    });

    it('should allow cleaning enum types', function() {
        var AddressType = Enum.create({
            values: {
                'home': {
                    title: 'Home'
                },

                'work': {
                    title: 'Work'
                }
            }
        });

        var Region = Enum.create({
            values: ['southeast']
        });

        var Climate = Enum.create({
            values: ['hot', 'humid']
        });

        var Address = Model.extend({
            properties: {
                city: String,
                state: String,
                type: AddressType,
                region: Region,
                climate: [Climate]
            }
        });

        var address = new Address({
            city: 'Durham',
            state: 'NC',
            type: AddressType.WORK,
            region: Region.SOUTHEAST,
            climate: [Climate.HOT, Climate.HUMID]
        });

        expect(Model.clean(address)).to.deep.equal({
            city: 'Durham',
            state: 'NC',
            type: 'work',
            region: 'southeast',
            climate: ['hot', 'humid']
        });
    });

    it('should allow cleaning enum types whose value is another type', function() {
        var Something = Model.extend({
            typeName: 'Something',
            properties: {
                name: String
            }
        });

        var MessageType = Enum.create({
            values: {
                abc: Something
            }
        });

        var Message = Model.extend({
            properties: {
                type: MessageType
            }
        });

        var message = new Message();
        message.setType(MessageType.abc);
        expect(message.getType()).to.equal(MessageType.abc);
        expect(message.getType().value()).to.equal(Something);

        expect(MessageType.abc.clean()).to.equal('abc');
        expect(Model.clean(MessageType.abc)).to.equal('abc');
        expect(message.data.type).to.equal(MessageType.abc);

        expect(Model.clean(message)).to.deep.equal({
            type: 'abc'
        });
    });

    it('should not clean property values associated with types that are not wrapped', function() {
        var Binary = Model.extend({
            wrap: false,
            coerce: function(value, options) {
                if (value == null) {
                    return value;
                }

                if (value.constructor === Buffer) {
                    return value;
                }

                if (value.constructor === String) {
                    return new Buffer(value, 'utf8');
                }

                this.coercionError(value, options, 'Invalid binary data.');
            }
        });

        var Image = Model.extend({
            properties: {
                data: Binary
            }
        });

        var image = new Image({
            data: 'abc'
        });

        expect(image.getData()).to.be.an.instanceof(Buffer);

        var str = image.getData().toString('utf8');

        expect(str).to.equal('abc');

        var cleanedImage = image.clean();
        expect(cleanedImage.data).to.be.an.instanceof(Buffer);
        expect(cleanedImage.data.toString('utf8')).to.equal('abc');
    });

    it('should allow unwrapped type to control how its value is cleaned via "clean: function"', function() {
        var Binary = Model.extend({
            wrap: false,
            clean: function(value) {
                // clean will convert to base64
                return value.toString('base64');
            },
            coerce: function(value, options) {
                if (value == null) {
                    return value;
                }

                if (value.constructor === Buffer) {
                    return value;
                }

                // Buffers can be of type array. We assume that if an array is passed,
                // that it is in fact an array buffer
                if (Array.isArray(value)) {
                    return new Buffer(value);
                }

                if (value.constructor === String) {
                    // assume a binary string is something that was base64 encoded
                    return new Buffer(value, 'base64');
                }

                this.coercionError(value, options, 'Invalid binary data.');
            }
        });

        var Data = Model.extend({
            properties: {
                binary: Binary
            }
        });

        var data = new Data({
            // binary data will be single byte with value 0
            binary: [0]
        });

        expect(data.getBinary()).to.be.an.instanceof(Buffer);
        expect(data.getBinary().length).to.equal(1);
        expect(data.getBinary().readInt8(0)).to.equal(0);

        var cleanedData = data.clean();
        expect(cleanedData.binary.constructor).to.equal(String);
        expect(cleanedData.binary).to.equal('AA==');


        var modelData = Data.wrap(cleanedData);
        expect(modelData.getBinary().constructor).to.equal(Buffer);
        expect(modelData.getBinary().length).to.equal(1);
        expect(modelData.getBinary().readInt8(0)).to.equal(0);
    });

    it('should allow wrapped type to control how its value is cleaned', function() {
        var LatLng = Model.extend({
            properties: {
                lat: Number,
                lng: Number
            },

            clean: function(value) {
                // clean function will convert the object back to its array form
                return [value.getLat(), value.getLng()];
            },

            // The coerce function will handle Array or Object as input
            // and validate that the resultant Object has lat and lng
            // non-null properties
            coerce: function(value, options) {
                if (value == null) {
                    return value;
                }

                if (Array.isArray(value)) {
                    // assume array contains [lat, lng] and convert to
                    // object representation
                    value = {
                        lat: value[0],
                        lng: value[1]
                    };
                }

                if ((value.lat == null) || (value.lng == null)) {
                    // do a little validation
                    this.coercionError(value, options, 'Invalid latitude/longitude.');
                }

                return value;
            }
        });

        var Location = Model.extend({
            properties: {
                coord: LatLng
            }
        });

        var location = new Location({
            coord: [35.994033, -78.898619]
        });

        expect(location.getCoord().getLat()).to.equal(35.994033);
        expect(location.getCoord().getLng()).to.equal(-78.898619);

        var cleaned = location.clean();
        expect(cleaned.coord[0]).to.equal(35.994033);
        expect(cleaned.coord[1]).to.equal(-78.898619);
    });

    it('should copy additional properties as-is when cleaning', function() {

        var Something = Model.extend({
            properties: {},
            additionalProperties: true
        });

        expect(Something.additionalProperties).to.equal(true);

        var something = new Something({
            abc: new Buffer('abc'),
            def: new Buffer('def')
        });

        var cleaned = Model.clean(something);
        expect(cleaned.abc).to.be.instanceof(Buffer);
        expect(cleaned.def).to.be.instanceof(Buffer);
        expect(cleaned.abc.toString()).to.equal('abc');
        expect(cleaned.def.toString()).to.equal('def');
    });

    it('should clean Object property', function() {
        var Something = Model.extend({
            properties: {
                data: Object
            }
        });

        var Person = Model.extend({
            properties: {
                name: String
            }
        });

        var something = new Something();

        something.setData(new Person({
            name: 'John Doe'
        }));

        var errors = [];
        var cleaned = Model.clean(something, errors);

        expect(errors).to.deep.equal([]);

        expect(cleaned).to.deep.equal({
            data: {
                name: 'John Doe'
            }
        });

        something.setData(Model.unwrap(new Person({
            name: 'John Doe'
        })));

        errors = [];
        cleaned = Model.clean(something, errors);

        expect(errors).to.deep.equal([]);

        expect(cleaned).to.deep.equal({
            data: {
                name: 'John Doe'
            }
        });
    });

    it('should clean object even if there is property with Object type whose value is Model instance', function() {
        var Something = Model.extend({
            properties: {
                config: Object
            }
        });

        var Filter = Model.extend({
            properties: {
                id: Number
            }
        });

        var Mapping = Model.extend({
            properties: {
                id: Number,
                filters: [Filter]
            }
        });

        var Config = Model.extend({
            properties: {
                mappings: [Mapping]
            }
        });

        var something = new Something();
        something.setConfig(new Config({
            mappings: [
                {
                    id: 1,
                    filters: [{id: 1}]
                },
                {
                    id: 2,
                    filters: [{id: 2}]
                },
                {
                    id: 3,
                    filters: [{id: 3}]
                }
            ]
        }));

        var errors = [];

        var cleaned = Model.clean(something, errors);

        expect(errors).to.deep.equal([]);
        expect(something.getConfig().getMappings().Model).to.equal(ArrayType);

        expect(cleaned).to.deep.equal({
            config: {
                mappings: [
                    {
                        id: 1,
                        filters: [{id: 1}]
                    },
                    {
                        id: 2,
                        filters: [{id: 2}]
                    },
                    {
                        id: 3,
                        filters: [{id: 3}]
                    }
                ]
            }
        });
    });

    it('should clean object that has property with type that extends Array', function() {
        var Filter = Model.extend({
            properties: {
                property: String,
                value: Object
            }
        });

        var Filters = ArrayType.extend({
            wrap: false,
            coerce: function(value, options) {
                if (value == null) {
                    return null;
                }

                if (!Array.isArray(value)) {
                    var filterObj = value;
                    value = [];
                    for (var key in filterObj) {
                        if (filterObj.hasOwnProperty(key)) {
                            var filter = new Filter({
                                property: key,
                                value: filterObj[key]
                            });
                            value.push(filter.unwrap());
                        }
                    }
                }

                return ArrayType.coerce(value, options);
            }
        });

        var Config = Model.extend({
            properties: {
                filters: {
                    type: Filters,
                    items: Filter
                }
            }
        });

        var errors = [];

        var config = new Config({
            filters: {
                job: 'test'
            }
        }, errors);

        expect(config.getFilters().Model).to.exist;

        expect(errors).to.deep.equal([]);

        var cleaned = Model.clean(config, errors);

        expect(errors).to.deep.equal([]);

        expect(cleaned).to.deep.equal({
            filters: [{property: 'job', value: 'test'}]
        });
    });

    it('should allow customizing clean via options', function() {
        var CleanFor = Enum.create({
            values: ['DATABASE']
        });

        var EntityId = Model.extend({
            wrap: false,
            clean: function(value, options) {
                if (options.target === CleanFor.DATABASE) {
                    if ((value.constructor !== String) && (value.constructor !== Number)) {
                        this.coercionError('Invalid ID', options);
                        return null;
                    }

                    // convert string to number if saving for database
                    return Number(value);
                } else {
                    return value;
                }
            }
        });



        var Entity = Model.extend({
            properties: {
                id: EntityId
            }
        });

        var entity = new Entity();
        entity.setId('123');

        var cleanedForDb = entity.clean({
            target: CleanFor.DATABASE
        });

        var cleanedForOther = entity.clean();

        expect(cleanedForDb.id).to.equal(123);
        expect(cleanedForOther.id).to.equal('123');

        var invalidEntityForDb = new Entity();
        invalidEntityForDb.setId(true);

        var errors = [];
        var cleaned = invalidEntityForDb.clean({
            target: CleanFor.DATABASE,
            errors: errors
        });

        expect(cleaned).to.deep.equal({
            id: null
        });

        expect(errors.length).to.equal(1);
    });

    it('should allow customizing cleaning values within array via options', function() {
        var CleanFor = Enum.create({
            values: ['DATABASE']
        });

        var EntityId = Model.extend({
            wrap: false,
            clean: function(value, options) {
                if (options.target === CleanFor.DATABASE) {
                    if ((value.constructor !== String) && (value.constructor !== Number)) {
                        this.coercionError('Invalid ID', options);
                        return null;
                    }

                    // convert string to number if saving for database
                    return Number(value);
                } else {
                    return value;
                }
            }
        });

        var EntityList = Model.extend({
            properties: {
                idList: [EntityId]
            }
        });

        var entityList = new EntityList();
        entityList.setIdList(['123', '456']);

        var errors = [];
        var cleaned = entityList.clean({
            errors: errors,
            target: CleanFor.DATABASE
        });

        expect(cleaned.idList[0]).to.equal(123);
        expect(cleaned.idList[1]).to.equal(456);
    });

    it('should clean model instance using clean method provided by type', function() {
        var Endpoint = Model.extend({
            clean: function(endpoint) {
                return endpoint.getType() + ':' + endpoint.getId();
            },

            properties: {
                type: String,
                id: Number
            }
        });

        var endpoint = new Endpoint({
            type: 'Agent',
            id: 5
        });

        var data = {
            endpoint: endpoint
        };

        expect(endpoint.clean()).to.equal('Agent:5');

        expect(Model.clean(data)).to.deep.equal({
            endpoint: 'Agent:5'
        });
    });

    it('should support afterClean in type', function() {
        var Endpoint = Model.extend({
            afterClean: function(endpoint) {
                delete endpoint.extra;
            },

            properties: {
                type: String,
                id: Number,
                extra: String
            }
        });

        var endpoint = new Endpoint({
            type: 'Agent',
            id: 5,
            extra: 'Test!'
        });

        var data = {
            endpoint: endpoint
        };

        expect(endpoint.clean()).to.deep.equal({
            type: 'Agent',
            id: 5
        });

        expect(Model.clean(data)).to.deep.equal({
            endpoint: {
                type: 'Agent',
                id: 5
            }
        });
    });

    it('should allow enum values to override clean in prototype', function() {
        var Gender = Enum.create({
            values: {
                MALE: {
                    code: 'M'
                },
                FEMALE: {
                    code: 'F'
                }
            },

            prototype: {
                clean: function() {
                    return this.data.code;
                }
            }
        });

        expect(Model.clean(Gender.MALE)).to.equal('M');
        expect(Model.clean(Gender.FEMALE)).to.equal('F');
    });

    it('should allow enum values to override clean in static method', function() {
        var Gender = Enum.create({
            values: {
                MALE: {
                    code: 'M'
                },
                FEMALE: {
                    code: 'F'
                }
            },

            clean: function(value) {
                return value.data.code;
            }
        });

        expect(Model.clean(Gender.MALE)).to.equal('M');
        expect(Model.clean(Gender.FEMALE)).to.equal('F');
    });
});