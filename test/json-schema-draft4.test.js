const test = require('ava');

const Model = require('../Model');
const Enum = require('../Enum');

const Entity = Model.extend({
  properties: {
    id: String
  }
});

const Gender = Enum.create({
  title: 'Gender',
  description: 'A person\'s gender',
  values: ['M', 'F']
});

const Species = Enum.create({
  title: 'Species',
  description: 'A species',
  values: ['dog', 'cat']
});

const Pet = Model.extend({
  properties: {
    name: String,
    species: Species
  }
});

const Person = Entity.extend({
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

const models = {
  Entity: Entity,
  Gender: Gender,
  Species: Species,
  Pet: Pet,
  Person: Person
};

function _dateToString (date) {
  const str = JSON.stringify(date);
  const len = str.length;
  return str.substring(1, len - 1);
}

const jsonSchema = require('../json-schema-draft4');
const schemasByNameMap = {};
const schemas = [];

// create z-schema validator
const ZSchema = require('z-schema');
const zschemaValidator = new ZSchema();

// create JaySchema validator
const JaySchema = require('jayschema');
const jschemaValidator = new JaySchema(function loader (ref, callback) {
  const schema = schemasByNameMap[ref];
  if (schema) {
    callback(null, schema);
  } else {
    callback(new Error('Invalid ref: ' + ref));
  }
});

function _validateObject (data, Type) {
  return new Promise((resolve, reject) => {
    const schema = schemasByNameMap[Type.typeName];

    const valid = zschemaValidator.validate(data, schema);
    if (!valid) {
      const err = zschemaValidator.getLastError();
      const betterErr = new Error(err.name + ' - ' + err.message + ': ' + err.details
        .toString());
      betterErr.stack = err.stack;
      return reject(betterErr);
    }

    jschemaValidator.validate(data, schema, (err, result) => {
      if (err) {
        return reject(err);
      }

      resolve(result);
    });
  });
}

test.before(function () {
  Object.keys(models).forEach(function (typeName) {
    const Type = models[typeName];
    Type.typeName = typeName;

    const schema = schemasByNameMap[typeName] = jsonSchema.fromModel(Type);
    schemas.push(schema);
  });
});

test.before(function () {
  const allSchemasValid = zschemaValidator.validateSchema(schemas);
  if (!allSchemasValid) {
    throw zschemaValidator.getLastError();
  }
});

test('should generate JSON schemas', function (t) {
  t.deepEqual(schemasByNameMap.Entity, {
    id: 'Entity',
    type: 'object',
    properties: {
      id: {
        type: 'string'
      }
    }
  });
  t.deepEqual(schemasByNameMap.Gender, {
    id: 'Gender',
    title: 'Gender',
    description: 'A person\'s gender',
    type: 'string',
    enum: ['M', 'F']
  });
  t.deepEqual(schemasByNameMap.Species, {
    id: 'Species',
    title: 'Species',
    description: 'A species',
    type: 'string',
    enum: ['dog', 'cat']
  });
  t.deepEqual(schemasByNameMap.Pet, {
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
  t.deepEqual(schemasByNameMap.Person, {
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

test('should handle converting model type to json schema without using composition', function (t) {
  const jsonSchema = require('../json-schema-draft4');

  const Response = Model.extend({
    properties: {
      result: {
        type: Object,
        key: 'res'
      }
    }
  });

  const PaginationResponse = Response.extend({
    properties: {
      limit: require('../Integer'),
      offset: require('../Integer'),
      count: require('../Integer')
    }
  });

  const schema = jsonSchema.fromModel(PaginationResponse, {
    useAllOf: false
  });

  const properties = {};

  PaginationResponse.forEachProperty(function (property) {
    properties[property.getKey()] = true;
  });

  t.deepEqual(properties, {
    res: true,
    limit: true,
    offset: true,
    count: true
  });

  t.deepEqual(schema, {
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

test('should validate complex data', async function (t) {
  const result = await _validateObject({
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
  }, Person);

  t.is(result, undefined);
});

test('should handle copying extra property metadata', function (t) {
  const MyType = Model.extend({
    properties: {
      something: {
        type: Object,
        extra: 'abc'
      }
    }
  });

  const schema = jsonSchema.fromModel(MyType, {
    handleProperty: function (propertyName, src, dest) {
      dest.extra = src.extra;
    }
  });

  t.is(schema.properties.something.extra, 'abc');
});
