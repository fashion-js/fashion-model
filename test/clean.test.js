const test = require('ava');

const Model = require('../Model');
const Enum = require('../Enum');
const ArrayType = require('../Array');

test('should deep clean', function (t) {
  const Gender = Enum.create({
    values: {
      MALE: {
        code: 'M'
      },
      FEMALE: {
        code: 'F'
      }
    }
  });

  const Person = Model.extend({
    properties: {
      displayName: String,
      gender: Gender
    }
  });

  const wrapper = {
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

  const cleaned = Model.clean(wrapper);

  t.is(wrapper.something.person.getDisplayName(), 'John Doe');

  t.deepEqual(cleaned, {
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

test('should allow cleaning of "hidden" model properties from raw data', function (t) {
  const Entity = Model.extend({
    properties: {
      id: {
        type: String,
        key: '_id'
      }
    }
  });

  const AddressType = Enum.create({
    values: {
      'home': {
        title: 'Home'
      },

      'work': {
        title: 'work'
      }
    }
  });

  const Address = Model.extend({
    properties: {
      city: String,
      state: String,
      type: AddressType
    }
  });

  const Person = Entity.extend({
    properties: {
      name: String,
      dateOfBirth: Date,
      address: Address
    }
  });

  const person = new Person({
    _id: 'test',
    name: 'John Doe',
    dateOfBirth: new Date(1980, 1, 1),
    address: new Address({
      city: 'Durham',
      state: 'NC',
      type: 'work'
    })
  });

  t.deepEqual(Model.clean(person), {
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

test('should allow cleaning enum types', function (t) {
  const AddressType = Enum.create({
    values: {
      'home': {
        title: 'Home'
      },

      'work': {
        title: 'Work'
      }
    }
  });

  const Region = Enum.create({
    values: ['southeast']
  });

  const Climate = Enum.create({
    values: ['hot', 'humid']
  });

  const Address = Model.extend({
    properties: {
      city: String,
      state: String,
      type: AddressType,
      region: Region,
      climate: [Climate]
    }
  });

  const address = new Address({
    city: 'Durham',
    state: 'NC',
    type: AddressType.WORK,
    region: Region.SOUTHEAST,
    climate: [Climate.HOT, Climate.HUMID]
  });

  t.deepEqual(Model.clean(address), {
    city: 'Durham',
    state: 'NC',
    type: 'work',
    region: 'southeast',
    climate: ['hot', 'humid']
  });
});

test('should allow cleaning enum types whose value is another type', function (t) {
  const Something = Model.extend({
    typeName: 'Something',
    properties: {
      name: String
    }
  });

  const MessageType = Enum.create({
    values: {
      abc: Something
    }
  });

  const Message = Model.extend({
    properties: {
      type: MessageType
    }
  });

  const message = new Message();
  message.setType(MessageType.abc);
  t.is(message.getType(), MessageType.abc);
  t.is(message.getType().value(), Something);

  t.is(MessageType.abc.clean(), 'abc');
  t.is(Model.clean(MessageType.abc), 'abc');
  t.is(message.data.type, MessageType.abc);

  t.deepEqual(Model.clean(message), {
    type: 'abc'
  });
});

test('should not clean property values associated with types that are not wrapped', function (t) {
  const Binary = Model.extend({
    wrap: false,
    coerce: function (value, options) {
      if (value == null) {
        return value;
      }

      if (value.constructor === Buffer) {
        return value;
      }

      if (value.constructor === String) {
        return Buffer.from(value, 'utf8');
      }

      this.coercionError(value, options, 'Invalid binary data.');
    }
  });

  const Image = Model.extend({
    properties: {
      data: Binary
    }
  });

  const image = new Image({
    data: 'abc'
  });

  t.true(image.getData() instanceof Buffer);

  const str = image.getData().toString('utf8');

  t.is(str, 'abc');

  const cleanedImage = image.clean();
  t.true(cleanedImage.data instanceof Buffer);
  t.is(cleanedImage.data.toString('utf8'), 'abc');
});

test('should allow unwrapped type to control how its value is cleaned via "clean: function"', function (t) {
  const Binary = Model.extend({
    wrap: false,
    clean: function (value) {
      // clean will convert to base64
      return value.toString('base64');
    },
    coerce: function (value, options) {
      if (value == null) {
        return value;
      }

      if (value.constructor === Buffer) {
        return value;
      }

      // Buffers can be of type array. We assume that if an array is passed,
      // that it is in fact an array buffer
      if (Array.isArray(value)) {
        return Buffer.from(value);
      }

      if (value.constructor === String) {
        // assume a binary string is something that was base64 encoded
        return Buffer.from(value, 'base64');
      }

      this.coercionError(value, options, 'Invalid binary data.');
    }
  });

  const Data = Model.extend({
    properties: {
      binary: Binary
    }
  });

  const data = new Data({
    // binary data will be single byte with value 0
    binary: [0]
  });

  t.true(data.getBinary() instanceof Buffer);
  t.is(data.getBinary().length, 1);
  t.is(data.getBinary().readInt8(0), 0);

  const cleanedData = data.clean();
  t.is(cleanedData.binary.constructor, String);
  t.is(cleanedData.binary, 'AA==');

  const modelData = Data.wrap(cleanedData);
  t.is(modelData.getBinary().constructor, Buffer);
  t.is(modelData.getBinary().length, 1);
  t.is(modelData.getBinary().readInt8(0), 0);
});

test('should allow wrapped type to control how its value is cleaned', function (t) {
  const LatLng = Model.extend({
    properties: {
      lat: Number,
      lng: Number
    },

    clean: function (value) {
      // clean function will convert the object back to its array form
      return [value.getLat(), value.getLng()];
    },

    // The coerce function will handle Array or Object as input
    // and validate that the resultant Object has lat and lng
    // non-null properties
    coerce: function (value, options) {
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

  const Location = Model.extend({
    properties: {
      coord: LatLng
    }
  });

  const location = new Location({
    coord: [35.994033, -78.898619]
  });

  t.is(location.getCoord().getLat(), 35.994033);
  t.is(location.getCoord().getLng(), -78.898619);

  const cleaned = location.clean();
  t.is(cleaned.coord[0], 35.994033);
  t.is(cleaned.coord[1], -78.898619);
});

test('should copy additional properties as-is when cleaning', function (t) {
  const Something = Model.extend({
    properties: {},
    additionalProperties: true
  });

  t.is(Something.additionalProperties, true);

  const something = new Something({
    abc: Buffer.from('abc'),
    def: Buffer.from('def')
  });

  const cleaned = Model.clean(something);
  t.true(cleaned.abc instanceof Buffer);
  t.true(cleaned.def instanceof Buffer);
  t.is(cleaned.abc.toString(), 'abc');
  t.is(cleaned.def.toString(), 'def');
});

test('should clean Object property', function (t) {
  const Something = Model.extend({
    properties: {
      data: Object
    }
  });

  const Person = Model.extend({
    properties: {
      name: String
    }
  });

  const something = new Something();

  something.setData(new Person({
    name: 'John Doe'
  }));

  let errors = [];
  let cleaned = Model.clean(something, errors);

  t.deepEqual(errors, []);

  t.deepEqual(cleaned, {
    data: {
      name: 'John Doe'
    }
  });

  something.setData(Model.unwrap(new Person({
    name: 'John Doe'
  })));

  errors = [];
  cleaned = Model.clean(something, errors);

  t.deepEqual(errors, []);

  t.deepEqual(cleaned, {
    data: {
      name: 'John Doe'
    }
  });
});

test('should clean object even if there is property with Object type whose value is Model instance', function (t) {
  const Something = Model.extend({
    properties: {
      config: Object
    }
  });

  const Filter = Model.extend({
    properties: {
      id: Number
    }
  });

  const Mapping = Model.extend({
    properties: {
      id: Number,
      filters: [Filter]
    }
  });

  const Config = Model.extend({
    properties: {
      mappings: [Mapping]
    }
  });

  const something = new Something();
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

  const errors = [];

  const cleaned = Model.clean(something, errors);

  t.deepEqual(errors, []);
  t.is(something.getConfig().getMappings().Model, ArrayType);

  t.deepEqual(cleaned, {
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

test('should clean object that has property with type that extends Array', function (t) {
  const Filter = Model.extend({
    properties: {
      property: String,
      value: Object
    }
  });

  const Filters = ArrayType.extend({
    wrap: false,
    coerce: function (value, options) {
      if (value == null) {
        return null;
      }

      if (!Array.isArray(value)) {
        const filterObj = value;
        value = [];
        for (let key in filterObj) {
          if (filterObj.hasOwnProperty(key)) {
            const filter = new Filter({
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

  const Config = Model.extend({
    properties: {
      filters: {
        type: Filters,
        items: Filter
      }
    }
  });

  const errors = [];

  const config = new Config({
    filters: {
      job: 'test'
    }
  }, errors);

  t.truthy(config.getFilters().Model);

  t.deepEqual(errors, []);

  const cleaned = Model.clean(config, errors);

  t.deepEqual(errors, []);

  t.deepEqual(cleaned, {
    filters: [{property: 'job', value: 'test'}]
  });
});

test('should allow customizing clean via options', function (t) {
  const CleanFor = Enum.create({
    values: ['DATABASE']
  });

  const EntityId = Model.extend({
    wrap: false,
    clean: function (value, options) {
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

  const Entity = Model.extend({
    properties: {
      id: EntityId
    }
  });

  const entity = new Entity();
  entity.setId('123');

  const cleanedForDb = entity.clean({
    target: CleanFor.DATABASE
  });

  const cleanedForOther = entity.clean();

  t.is(cleanedForDb.id, 123);
  t.is(cleanedForOther.id, '123');

  const invalidEntityForDb = new Entity();
  invalidEntityForDb.setId(true);

  const errors = [];
  const cleaned = invalidEntityForDb.clean({
    target: CleanFor.DATABASE,
    errors: errors
  });

  t.deepEqual(cleaned, {
    id: null
  });

  t.is(errors.length, 1);
});

test('should allow customizing cleaning values within array via options', function (t) {
  const CleanFor = Enum.create({
    values: ['DATABASE']
  });

  const EntityId = Model.extend({
    wrap: false,
    clean: function (value, options) {
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

  const EntityList = Model.extend({
    properties: {
      idList: [EntityId]
    }
  });

  const entityList = new EntityList();
  entityList.setIdList(['123', '456']);

  const errors = [];
  const cleaned = entityList.clean({
    errors: errors,
    target: CleanFor.DATABASE
  });

  t.is(cleaned.idList[0], 123);
  t.is(cleaned.idList[1], 456);
});

test('should clean model instance using clean method provided by type', function (t) {
  const Endpoint = Model.extend({
    clean: function (endpoint) {
      return endpoint.getType() + ':' + endpoint.getId();
    },

    properties: {
      type: String,
      id: Number
    }
  });

  const endpoint = new Endpoint({
    type: 'Agent',
    id: 5
  });

  const data = {
    endpoint: endpoint
  };

  t.is(endpoint.clean(), 'Agent:5');

  t.deepEqual(Model.clean(data), {
    endpoint: 'Agent:5'
  });
});

test('should support afterClean in type', function (t) {
  const Endpoint = Model.extend({
    afterClean: function (endpoint) {
      delete endpoint.extra;
    },

    properties: {
      type: String,
      id: Number,
      extra: String
    }
  });

  const endpoint = new Endpoint({
    type: 'Agent',
    id: 5,
    extra: 'Test!'
  });

  const data = {
    endpoint: endpoint
  };

  t.deepEqual(endpoint.clean(), {
    type: 'Agent',
    id: 5
  });

  t.deepEqual(Model.clean(data), {
    endpoint: {
      type: 'Agent',
      id: 5
    }
  });
});

test('should allow enum values to override clean in prototype', function (t) {
  const Gender = Enum.create({
    values: {
      MALE: {
        code: 'M'
      },
      FEMALE: {
        code: 'F'
      }
    },

    prototype: {
      clean: function () {
        return this.data.code;
      }
    }
  });

  t.is(Model.clean(Gender.MALE), 'M');
  t.is(Model.clean(Gender.FEMALE), 'F');
});

test('should allow enum values to override clean in static method', function (t) {
  const Gender = Enum.create({
    values: {
      MALE: {
        code: 'M'
      },
      FEMALE: {
        code: 'F'
      }
    },

    clean: function (value) {
      return value.data.code;
    }
  });

  t.is(Model.clean(Gender.MALE), 'M');
  t.is(Model.clean(Gender.FEMALE), 'F');
});
