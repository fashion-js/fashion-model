const Model = require('./Model');
const Enum = require('./Enum');

const DEFAULT_TO_REF = function (Type) {
  if (!Type.typeName) {
    throw new Error('Cannot build ref to type that does not have "typeName"');
  }

  return Type.typeName;
};

const DEFAULT_IS_IGNORED_PROPERTY = function (name, property) {
  return false;
};

const SPECIAL_TYPES = {
  'any': {
    configureJsonSchemaProperty: function (jsonSchemaProperty) {
      delete jsonSchemaProperty.type;
    }
  },

  'object': {
    configureJsonSchemaProperty: function (jsonSchemaProperty) {
      jsonSchemaProperty.type = 'object';
    }
  },

  'boolean': {
    configureJsonSchemaProperty: function (jsonSchemaProperty) {
      jsonSchemaProperty.type = 'boolean';
    }
  },

  'date': {
    configureJsonSchemaProperty: function (jsonSchemaProperty) {
      jsonSchemaProperty.type = 'string';
      jsonSchemaProperty.format = 'date-time';
    }
  },

  'integer': {
    configureJsonSchemaProperty: function (jsonSchemaProperty) {
      jsonSchemaProperty.type = 'integer';
    }
  },

  'number': {
    configureJsonSchemaProperty: function (jsonSchemaProperty) {
      jsonSchemaProperty.type = 'number';
      jsonSchemaProperty.format = 'double';
    }
  },

  'string': {
    configureJsonSchemaProperty: function (jsonSchemaProperty) {
      jsonSchemaProperty.type = 'string';
    }
  }
};

function _configure (jsonSchemaProperty, Type, options) {
  const typeName = Type.typeName;
  let specialType;
  if (typeName && ((specialType = SPECIAL_TYPES[typeName]) !== undefined)) {
    specialType.configureJsonSchemaProperty(jsonSchemaProperty);
  } else {
    jsonSchemaProperty.$ref = options.toRef(Type);
  }
}

const IGNORED_PROPERTIES = {
  constructor: 1,
  $super: 1
};

exports.configureSchema = function (schema, Type, options) {
  options = options || {};
  options.toRef = options.toRef || DEFAULT_TO_REF;
  _configure(schema, Type, options);
};

exports.fromModel = function (Type, options) {
  options = options || {};

  options.toRef = options.toRef || DEFAULT_TO_REF;
  options.isIgnoredProperty = options.isIgnoredProperty || DEFAULT_IS_IGNORED_PROPERTY;

  const schema = {};

  if (Type.typeName) {
    schema.id = Type.typeName;
  }

  ['title', 'description', 'pattern'].forEach(function (attr) {
    const value = Type[attr];
    if (value !== undefined) {
      schema[attr] = value;
    }
  });

  const useAllOf = (options.useAllOf !== false);
  if (useAllOf) {
    // "allOf" is used to express composition.
    // However, swagger-ui currently doesn't handle composition very well
    // so we provide an option for disabling its usage.
    // When "allOf" is disabled, the inherited properties are automatically
    // put into the derived type definitions
    const SuperType = Type.$super;
    if (SuperType && (SuperType !== Model) && !SuperType.isCompatibleWith(Enum)) {
      schema.allOf = [
        {
          $ref: options.toRef(SuperType)
        }
      ];
    }
  }

  if (Type.isCompatibleWith(Enum)) {
    schema.type = 'string';
    schema.enum = Type.names;
  } else if (Type.hasProperties()) {
    schema.type = 'object';
    const properties = schema.properties = {};

    Type.forEachProperty({
      inherited: !useAllOf
    }, function (declaredProperty) {
      const key = declaredProperty.getKey();
      if (!IGNORED_PROPERTIES[key] && !options.isIgnoredProperty(key, declaredProperty)) {
        const jsonSchemaProperty = properties[key] = {};

        ['title', 'description'].forEach(function (attr) {
          const value = declaredProperty[attr];
          if (value !== undefined) {
            jsonSchemaProperty[attr] = value;
          }
        });

        if (options.handleProperty) {
          options.handleProperty(key, declaredProperty, jsonSchemaProperty);
        }

        const PropertyType = declaredProperty.type;

        if (declaredProperty.type.typeName === 'array') {
          jsonSchemaProperty.type = 'array';

          const items = declaredProperty.items;
          jsonSchemaProperty.items = {};

          if (items) {
            _configure(jsonSchemaProperty.items, items.type, options);
          }
        } else {
          _configure(jsonSchemaProperty, PropertyType, options);
        }
      }
    });
  } else if (Type.jsonSchemaType) {
    schema.type = Type.jsonSchemaType;
  } else {
    return null;
  }

  return schema;
};
