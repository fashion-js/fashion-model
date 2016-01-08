var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();

var expect = require('chai').expect;

var Model = require('../Model');
var Enum = require('../Enum');

var Entity = Model.extend({
    properties: {
        id: String
    }
});

var Gender = Enum.create({
    title: 'Gender',
    description: 'A person\'s gender',
    values: ['M', 'F']
});

var Species = Enum.create({
    title: 'Species',
    description: 'A species',
    values: ['dog', 'cat']
});

var Pet = Model.extend({
    properties: {
        name: String,
        species: Species
    }
});

var Person = Entity.extend({
    title: 'Person',
    description: 'A person',
    properties: {
        name: String,
        dateOfBirth: Date,
        gender: Gender,
        age: 'integer',
        pets: [Pet],
        favoriteNumbers: ['integer'],
        anything: [],
        blob: Object
    }
});

var models = {
    Entity: Entity,
    Gender: Gender,
    Species: Species,
    Pet: Pet,
    Person: Person
};

function _dateToString(date) {
    var str = JSON.stringify(date);
    var len = str.length;
    return str.substring(1, len - 1);
}

describe('fashion-model json-schema support', function() {
    describe('draft4', function() {
        var jsonSchema = require('../json-schema-draft4');
        var schemasByNameMap = {};
        var schemas = [];

        // create z-schema validator
        var ZSchema = require('z-schema');
        var zschemaValidator = new ZSchema();

        // create JaySchema validator
        var JaySchema = require('jayschema');
        var jschemaValidator = new JaySchema(function loader(ref, callback) {
            var schema = schemasByNameMap[ref];
            if (schema) {
                callback(null, schema);
            } else {
                callback(new Error('Invalid ref: ' + ref));
            }
        });

        function _validateObject(data, Type, callback) {
            var schema = schemasByNameMap[Type.typeName];

            var valid = zschemaValidator.validate(data, schema);
            if (!valid) {
                var err = zschemaValidator.getLastError();
                var betterErr = new Error(err.name + ' - ' + err.message + ': ' + err.details
                    .toString());
                betterErr.stack = err.stack;
                return callback(betterErr);
            }

            jschemaValidator.validate(data, schema, callback);
        }

        before(function() {
            Object.keys(models).forEach(function(typeName) {
                var Type = models[typeName];
                Type.typeName = typeName;

                var schema = schemasByNameMap[typeName] = jsonSchema.fromModel(Type);
                schemas.push(schema);
            });
        });

        before(function() {
            var allSchemasValid = zschemaValidator.validateSchema(schemas);
            if (!allSchemasValid) {
                throw zschemaValidator.getLastError();
            }
        });

        it('should generate JSON schemas', function() {
            expect(schemasByNameMap.Entity).to.deep.equal({
                id: 'Entity',
                type: 'object',
                properties: {
                    id: {
                        type: 'string'
                    }
                }
            });
            expect(schemasByNameMap.Gender).to.deep.equal({
                id: 'Gender',
                title: 'Gender',
                description: 'A person\'s gender',
                type: 'string',
                enum: ['M', 'F']
            });
            expect(schemasByNameMap.Species).to.deep.equal({
                id: 'Species',
                title: 'Species',
                description: 'A species',
                type: 'string',
                enum: ['dog', 'cat']
            });
            expect(schemasByNameMap.Pet).to.deep.equal({
                id: 'Pet',
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    },
                    species: {
                        '$ref': 'Species'
                    }
                }
            });
            expect(schemasByNameMap.Person).to.deep.equal({
                id: 'Person',
                title: 'Person',
                description: 'A person',
                allOf: [{
                    '$ref': 'Entity'
                }],
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    },
                    dateOfBirth: {
                        type: 'string',
                        format: 'date-time'
                    },
                    gender: {
                        '$ref': 'Gender'
                    },
                    age: {
                        type: 'integer'
                    },
                    pets: {
                        type: 'array',
                        items: {
                            $ref: 'Pet'
                        }
                    },
                    favoriteNumbers: {
                        type: 'array',
                        items: {
                            type: 'integer'
                        }
                    },
                    anything: {
                        type: 'array',
                        items: {}
                    },
                    blob: {
                        type: 'object'
                    }
                }
            });
        });

        it('should handle converting model type to json schema without using composition',
            function() {

                var jsonSchema = require('../json-schema-draft4');

                var Response = Model.extend({
                    properties: {
                        result: {
                            type: Object,
                            key: 'res'
                        }
                    }
                });

                var PaginationResponse = Response.extend({
                    properties: {
                        limit: require('../Integer'),
                        offset: require('../Integer'),
                        count: require('../Integer')
                    }
                });

                var schema = jsonSchema.fromModel(PaginationResponse, {
                    useAllOf: false
                });

                var properties = {};

                PaginationResponse.forEachProperty(function(property) {
                    properties[property.getKey()] = true;
                });

                expect(properties).to.deep.equal({
                    res: true,
                    limit: true,
                    offset: true,
                    count: true
                });

                expect(schema).to.deep.equal({
                    properties: {
                        count: {
                            type: 'integer'
                        },
                        limit: {
                            type: 'integer'
                        },
                        offset: {
                            type: 'integer'
                        },
                        res: {
                            type: 'object'
                        }
                    },
                    type: 'object'
                });
            });

        it('should validate complex data', function(done) {
            _validateObject({
                id: 'john.doe',
                name: 'John Doe',
                dateOfBirth: _dateToString(new Date(2015, 10, 10)),
                gender: 'M',
                age: 5,
                pets: [
                    {
                        name: 'max',
                        species: 'dog'
                    }
                ],
                favoriteNumbers: [1, 2, 3],
                anything: ['a', 'b'],
                blob: {
                    test: 123
                }
            }, Person, function(err) {
                if (err) {
                    throw err;
                }

                done();
            });
        });

        it('should handle copying extra property metadata', function(done) {
            var MyType = Model.extend({
                properties: {
                    something: {
                        type: Object,
                        extra: 'abc'
                    }
                }
            });

            var schema = jsonSchema.fromModel(MyType, {
                handleProperty: function(propertyName, src, dest) {
                    dest.extra = src.extra;
                }
            });

            expect(schema.properties.something.extra).to.equal('abc');

            done();
        });
    });
});
