fashion-model
=============
JavaScript library for defining types and their properties with support for
wrapping/unwrapping, serialization/deserialization, validation, and JSON schema.

## Installation
```bash
npm install fashion-model --save
```

## Overview
The `fashion-model` module provides utility code for defining data model types.
These data model types provide helpful accessor methods (getters and setters)
for the properties defined for the model type. This module is compatible
with both web browser and Node.js runtime environments.

These models can be thought of as a "schema" that provide extra safeguards
for working with objects. These model types are not tied to a specific
data storage backend so you can use these in the browser or on the
server-side with very little overhead. This approach to defining your
schema is similar to [Mongoose](http://mongoosejs.com/docs/guide.html)
schemas except that this library is not tied to MongoDB or any other
storage engine.

If you application is fetching data from the database for a client request and
there is no need to process the data, then simply serialize the data
without creating `Model` instances to wrap the data. Creating `Model` instances
creates unnecessary overhead with no benefit (this is the default behavior
of [Mongoose](http://mongoosejs.com/docs/guide.html)). However, if you're
accessing or setting properties on an object then you might find it
helpful to wrap the raw object with a `Model` instance and use the
getters and setters to work with the data.

## Relationship to JSON Schema
Model definitions are similar to JSON Schema and, when possible, similar
naming conventions were chosen. However, this module is more tailored to runtime
usage. If desired, you can convert your model definitions to a JSON Schema
representation fairly easily. See [JSON Schema section](#json-schema) for more
information.

## Usage

### Requiring
```javascript
// Requiring the base Model type
var Model = require('fashion-model');

// Variation on requiring the Model type
var Model = require('fashion-model/Model');

// Requiring the Enum type factory
var Enum = require('fashion-model/Enum');

// Create new model type
var NewModel = Model.extend(config);

// Create new enum type
var NewEnum = Enum.create(config);
```

### Primitive Types
The following primitive types are supported:

| Data Type | JavaScript Type | Alias           | Model Type                          |
|-----------|-----------------|-----------------|-------------------------------------|
| Date      | Date            | `"date"`        | `require("fashion-model/Date")`     |
| Boolean   | Boolean         | `"boolean"`     | `require("fashion-model/Boolean")`  |
| Number    | Number          | `"number"`      | `require("fashion-model/Number")`   |
| Integer   |                 | `"integer"`     | `require("fashion-model/Integer")`  |
| String    | String          | `"string"`      | `require("fashion-model/String")`   |
| Array     | Array           | `"array"` / `[]`| `require("fashion-model/Array")`    |
| Function  | Function        | `"function"`    | `require("fashion-model/Function")` |

### Complex Object Type

**Declare custom complex object type:**
```javascript
var Address = Model.extend({
    properties: {
        city: String,
        state: String
    }
});
```

**Create instance via `new` constructor with no initial data:**
```javascript
// Create via constructor with no initial data
var address = new Address();
address.setCity('San Francisco');
address.setState('CA');
```

**Create instance via `new` constructor with some initial data:**
```javascript
// Create via constructor with initial data
var address = new Address({
    city: 'San Francisco',
    state: 'CA'
});
```

**Create instance via `create` method:**
```javascript
// Create via "create" function
var address = Address.create();
address.setCity('San Francisco');
address.setState('CA');
```

**Create instance by wrapping existing data:**
```javascript
// Create via "wrap" function
address = Address.wrap({
    city: 'San Francisco',
    state: 'CA'
});
```

### Types that Implement EventEmitter

Types that extend `Model` will not implement the `EventEmitter` interface.
If your type should be an `EventEmitter` then your type should either extend
`require('fashion-model/ObservableModel')` or add the `EventEmitter` mixin.
Types that implement EventEmitter will emit `change` and `change:someProperty`
events

**Example using ObservableModel:**

```javascript
var Something = require('fashion-model/ObservableModel').extend({
    properties: {
        value: String
    }
});
```

**Example using mixin:**

```javascript
var Something = require('fashion-model/Model').extend({
    properties: {
        value: String
    },
    mixins: [require('fashion-model/mixins/EventEmitter')]
});
```


**Listening for property value changes:**

```javascript
var something = new Something();

something.on('change:value', function(event) {
    // The "value" property changed
    console.log(
        'Old value: ' + event.oldValue,
        'New value: ' + event.newValue);
});

something.on('change', function(event) {
    // Some property changed
    console.log(
        'Property: ' + event.propertyName,
        'Old value: ' + event.oldValue,
        'New value: ' + event.newValue);
});
```

### Self-type References in Properties

In some use cases, the type of a property is the
same type as the complex object for which the
property is declared. For exampled, to build
a linked list, each node has a pointer to the next
node.

**Here are some examples of self-type references:**

```javascript
// Declare a linked list node type that has a pointer
// to the next node
var LinkedListNode = Model.extend({
    properties: {
        next: 'self',
        value: Object
    }
});

// Here is another functionally equivalent variation of LinkedListNode
var LinkedListNode = Model.extend({
    properties: {
        next: {
            type: 'self'
        },
        value: Object
    }
});

// An example of self-type reference within an array
var TreeNode = Model.extend({
    properties: {
        children: ['self'],
        value: Object
    }
});

// Here is another functionally equivalent variation of TreeNode
var TreeNode = Model.extend({
    properties: {
        // Brackets at end of type name are used to denote arrays
        children: 'self[]',
        value: Object
    }
});
```

### Getters and Setters
A getter and setter will be generated on the prototype,
for each property defined in the model.

**For example:**
```javascript
// Define an Address model
var Address = Model.extend({
    properties: {
        city: String,
        state: String
    }
});

// Create instance of Address
var address = new Address();

// Use the generated setter to set the city
address.setCity('New York');

// Use the generated getter to get the city
assert(address.getCity() === 'New York')
```

**Note:** The getter function name will be always in the form
`get<PropertyName>`. The setter function name will be always in the form
`set<PropertyName>`. These rules **do not** change for properties with Boolean type.

### Model prototype
The `Model` types are created via standard prototypical inheritance.
If you wish to conveniently add other methods or properties to the
prototype then use use the `prototype` property in the `Model`
configuration.

**For example:**
```javascript
var Person = Entity.extend({
    properties: {
        firstName: String,
        lastName: String
    },
    prototype: {
        getDisplayName: function() {
            return this.getFirstName() + ' ' + this.getLastName();
        }
    }
});
```

### Inheritance

**Define your base Entity type:**
```javascript
var Entity = Model.extend({
    properties: {
        id: String
    }
});
```

**Define a type that extends Entity:**
```javascript
var Person = Entity.extend({
    properties: {
        email: String
    }
});
```

The new `Person` type will recognize `email` (defined for `Person`) and
`id` (defined for `Entity`) as properties.

```javascript
var person = new Person();
person.setId('john-doe');
person.setEmail('john.doe@example.com');
```

You can also create getters for computed/derived properties.

**For example:**
```javascript
var Person = Entity.extend({
    properties: {
        firstName: String,
        lastName: String,
        displayName: {
            type: String
            get: function(name, property) {
                return this.getFirstName() + ' ' + this.getLastName();
            }
        }
    }
});
```

### Non-persisted Properties

If you'd like to store computed properties in the Model instance for
performance reasons but you don't want them to be persisted to storage,
then you might want to mark an property as non-persisted.

**For example, here's a Model type that will automatically
update `displayName` whenever `firstName` or `lastName` is changed:**
```javascript
function _updateDisplayName(person) {
    person.setDisplayName(person.getFirstName() + ' ' + person.getLastName());
}

var Person = Entity.extend({
    properties: {
        firstName: {
            type: String,
            set: function(name, value, property) {
                this.data[name] = value;
                _updateDisplayName(this);
            }
        },
        lastName: {
            type: String,
            set: function(name, value, property) {
                this.data[name] = value;
                _updateDisplayName(this);
            }
        },
        // displayName is updated whenever firstName or lastName change
        displayName: {
            type: String,

            // do not persist displayName when clean() is called since it is
            // a derived value
            persist: false
        }
    }
});

var person = new Person({
    firstName: 'John',
    lastName: 'Doe'
});

assert(person.getDisplayName() === 'John Doe');

// Remove non-persisted properties
var personObj = person.clean();
assert(personObj.displayName === undefined);
```

### Wrap/Unwrap

`Model.unwrap(obj)` can used to return the underlying data for a `Model`
instance. If the given `obj` is not a `Model` instance then `obj` is returned.

`SomeType.wrap(obj)` can be used to ensure that the given obj is
wrapped as `SomeType`. If `obj` is already `SomeType` then `obj`
will simply be returned.

**Examples:**
```javascript
var Address = Model.extend({
    properties: {
        city: String,
        state: String
    }
});

var address = new Address({
    city: 'San Francisco',
    state: 'CA'
});

// Create an instance of Address
var addressObj = Model.unwrap(address);
assert(addressObj.city === 'San Francisco');

// Wrap the unwrapped object
var addressWrapped = Address.wrap(addressObj);
assert(addressWrapped.getCity() === 'San Francisco');

// The wrapped object returned by Address.wrap()
// will be the original Model instance that we created.
assert(addressWrapped === address);
```

### Clean

`Model.clean(obj)` should be used to return a clone of an object in which
all non-persisted properties and metadata have been removed. The clean
function will always return a deep clone of the given object if the
given argument is non-null and not a primitive.

```javascript
var address = new Address({
    city: 'San Francisco',
    state: 'CA'
});

// When saving a model object to disk or storage, use clean to remove
// unnecessary fields.
db.save(address.clean(), callback);
```

A `Model` can also control how its data is cleaned by providing a `clean`
property. For example, this might be helpful for working with binary data
by automatically encoding the binary data as a base64 string.

A `Model` type that is not wrapped (that is, when `wrap: false` flag is provided),
its value will not be cleaned unless a `function` is provided for the clean
property.

Here's an example how to use the `clean` function to convert a `Buffer`
to a Base64 encoded string:

```javascript
var Binary = Model.extend({
    // Don't wrap binary data because we want to use the raw Buffer type
    // provided by Node.js runtime environment
    wrap: false,

    // Provide a clean function that will be used to clean values
    // associated with properties whose type is Binary
    clean: function(value) {
        // clean will convert to base64
        return value.toString('base64');
    },

    coerce: function(value, options) {
        if (value == null) {
            return value;
        }

        if (value.constructor === Buffer) {
            // no conversion needed
            return value;
        }

        // Buffers can be of type array. We assume that if an array is provided,
        // that it is an array of bytes.
        if (Array.isArray(value)) {
            return new Buffer(value);
        }

        if (value.constructor === String) {
            // assume that a string represents base64 encoded data
            return new Buffer(value, 'base64');
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
    // data can be provided as Array of bytes, base64 encoded string, or Buffer
    // because Binary.coerce function handles each of these.
    data: someData
});

// the data will be converted to Buffer object via Binary.coerce function
assert(image.getData() instanceof Buffer);

// Calling clean on the image model instance will cause the contained data
// to be converted to base64 string via Binary.clean function.
var cleanedImage = image.clean();

// the data will be converted to String via Binary.clean function
assert(typeof cleanedImage.data.constructor === 'string');

// log the Base64 encoded string
console.log(cleanedImage.data);
```

### Stringify

Model instances have a `stringify` function that can be used to
safely stringify the instance.

**For example:**
```javascript
// Stringify and do not add extra white-space
console.log(model.stringify());

// Stringify and include extra white-space for better readability
console.log(model.stringify(true));
```

### Type Coercion

As a developer, you may choose to be lenient about how certain non-Model
instances are coerced into instances of a Model.

For example, consider this example of declaring `ObjectId` type that
automatically coerces Strings to actual instances of `require('mongodb').ObjectID`:
```javascript
var MongoDbObjectID = require('mongodb').ObjectID;

var ObjectId = Model.extend({
    // Don't wrap object ID.
    // This means that the getters for properties of this type
    // will return the raw MongoDB ObjectID type
    wrap: false,

    // We provide a "coerce" function to convert a value to the proper
    // MongoDB ObjectID type
    coerce: function(data) {
        if (data == null) {
            return data;
        } else {
            // Use the MongoDB ObjectID constructor to coerce our
            // value (for example, it will handle String instances)
            return new MongoDbObjectID(data);
        }
    }
});

var Entity = Model.extend({
    id: {
        // ObjectId is a type that we use just to make sure that the value
        // is automatically converted to the type that we need for storage
        type: ObjectId,

        // MongoDB data storage expects a document to store its
        // identifier in the "_id" property but we still want to
        // access it via "getId" and "setId" (and not "get_id" and "set_id")
        property: '_id'
    }
})
```
Models that use the primitive `Date` type also benefit from type coercion.
The `Date` coerce function provided by `fashion-model` automatically convert
strings in ISO date format to `Date` instances. You will probably find this helpful because,
by default, `JSON.stringify(obj)` will automatically convert `Date` objects
to Strings using the standard ISO format.

**For example:**
```javascript
var Document = Model.extend({
    dateCreated: Date
});

var document = new Document();
// A String value in ISO date format is automatically converted to a
// real Date.
document.setDateCreated('2014-12-22T21:18:45.905Z');
```

### Enum Type

**Short-hand syntax for declaring an enum type:**

```javascript
var Color = Enum.create(['red', 'green', 'blue']);
```

**Alternate syntax for declaring an enum type:**

```javascript
var Color = Enum.create({
    values: ['red', 'green', 'blue']
});
```

**Enum type access patterns:**

Based on the `Color` enum type declared in examples above,
the constant enum values will be accessible from the new
`Color` type. Each `Color` enum value will have some helper
functions as shown shown in the examples below.

```javascript
// The following assertions will be true
// test to see

// Check to see if given color is the RED enum value
var color = Color.RED;
assert(color.isRed());

// Get the name of the enum
assert(Color.RED.name() === 'red');

// Get the value associated with the enum
assert(Color.RED.value() === 'red');

// Clean the enum value which will return its name
assert(Color.RED.clean() === 'red');
```

**Object enum values:**
```javascript
var Color = Enum.create({
    values: {
        red: {
            hex: '#FF0000',
            name: 'Red'
        },

        green: {
            hex: '#00FF00',
            name: 'Green'
        },

        blue: {
            hex: '#0000FF',
            name: 'Blue'
        }
    }
});

// The following assertions will be true:
assert(Color.red.name() === 'red');
assert(Color.red.value().hex === '#FF0000');
assert(Color.red.value().name === 'Red');
assert(Color.RED.name() === 'red');
assert(Color.RED.value().hex === '#FF0000');
assert(Color.RED.value().name === 'Red');
```

**Loop over values:**
```javascript
Color.values.forEach(function(colorValue) {
    console.log('Color ' + colorValue.name());
});
```

**Loop over names:**
```javascript
Color.names.forEach(function(colorName) {
    console.log('Color ' + colorName);
});
```

### Array Type

**Syntax:**
```javascript
var Color = Enum.create({
    values: ['red', 'green', 'blue']
});

var ColorPalette = Model.extend({
    properties: {
        colors: {
            // colors has type array
            type: Array,

            // each item in the array is a Color
            items: Color
        }
    }
});
```

**Short-hand syntax:**
```javascript
var ColorPalette = Model.extend({
    properties: {
        // Using an Array instance is short-hand for specifying
        // that the property is of type array. The first item
        // in this array indicates the type of each item.
        colors: [Color]
    }
});
```

**Accessing an array property:**
```javascript
var colorPalette = new ColorPalette({
    colors: ['red', 'green', 'blue']
});

// getColors() will return an Array and we can use the "forEach" function.
// Each item in the returned Array will be an instance of Color.
colorPalette.getColors().forEach(function(color, index) {
    assert(color.constructor === Color);
});
```

### Object Validation

**Using array to capture errors:**

```javascript
// array that will collect errors
var errors = [];

// collect errors while wrapping existing person data
var person1 = Person.wrap({
    name: 'John',
    age: 'bad integer'
}, errors);

// collect errors while constructing new person
var person2 = new Person({
    name: 'John',
    age: 'bad integer'
}, errors);
```

**Using extended options:**

```javascript
var options = {
    // array that will collect errors
    errors: [],

    // strict mode is used by some primitive types to require
    // that values be of the same primitive types
    // (no automatic type coercion)
    strict: true
};

var person = new Person({
    name: 'John',
    age: 'bad integer'
}, options);
```

### <a name="json-schema"></a>JSON Schema

A `Model` type can be easily converted to an equivalent JSON schema
with the following module:
```javascript
var jsonSchema = require('fashion-model/json-schema-draft4');
var someModelSchema = jsonSchema.fromModel(SomeModel, options);
```

| Option | Type | Purpose |
| ------ | ---- | ------- |
| `toRef` | `function(Model)` | This function can be used to turn a Model definition to a reference name (return value will be used as value for `$ref` properties) |
| `isIgnoredProperty` | `function(name, property)` | This function can be used to exclude a property from the schema definition of a complex object |


#### Convert Model to JSON Schema

**Define your models:**

```javascript
var Model = require('fashion-model/Model');
var Enum = require('fashion-model/Enum');

var Entity = Model.extend({
    typeName: 'Entity',
    properties: {
        id: String
    }
});

var Gender = Enum.create({
    typeName: 'Gender',
    title: 'Gender',
    description: 'A person\'s gender',
    values: ['M', 'F']
});

var Species = Enum.create({
    typeName: 'Species',
    title: 'Species',
    description: 'A species',
    values: ['dog', 'cat']
});

var Pet = Model.extend({
    typeName: 'Pet',
    properties: {
        name: String,
        species: Species
    }
});

var Person = Entity.extend({
    typeName: 'Person',
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
```

**Convert your model to JSON schema:**

```javascript
var jsonSchema = require('fashion-model/json-schema-draft4');
var jsonSchemaOptions = {
    toRef: function(Model) {
        return Model.typeName;
    }
};

var EntitySchema = jsonSchema.fromModel(Entity, jsonSchemaOptions);
var GenderSchema = jsonSchema.fromModel(Gender, jsonSchemaOptions);
var SpeciesSchema = jsonSchema.fromModel(Species, jsonSchemaOptions);
var PetSchema = jsonSchema.fromModel(Pet, jsonSchemaOptions);
var PersonSchema = jsonSchema.fromModel(Person, jsonSchemaOptions);
```

**Entity JSON Schema:**

```json
{
   "id": "Entity",
   "type": "object",
   "properties": {
      "id": {
         "type": "string"
      }
   }
}
```

**Gender JSON Schema:**

```json
{
   "id": "Gender",
   "title": "Gender",
   "description": "A person's gender",
   "type": "string",
   "enum": [
      "M",
      "F"
   ]
}
```

**Species JSON Schema:**

```json
{
   "id": "Species",
   "title": "Species",
   "description": "A species",
   "type": "string",
   "enum": [
      "dog",
      "cat"
   ]
}
```

**Pet JSON Schema:**

```json
{
   "id": "Pet",
   "type": "object",
   "properties": {
      "name": {
         "type": "string"
      },
      "species": {
         "$ref": "Species"
      }
   }
}
```

**Person JSON Schema:**

```json
{
   "id": "Person",
   "title": "Person",
   "description": "A person",
   "allOf": [
      {
         "$ref": "Entity"
      }
   ],
   "type": "object",
   "properties": {
      "name": {
         "type": "string"
      },
      "dateOfBirth": {
         "type": "string",
         "format": "date-time"
      },
      "gender": {
         "$ref": "Gender"
      },
      "age": {
         "type": "integer"
      },
      "pets": {
         "type": "array",
         "items": {
            "$ref": "Pet"
         }
      },
      "favoriteNumbers": {
         "type": "array",
         "items": {
            "type": "integer"
         }
      },
      "anything": {
         "type": "array"
      },
      "blob": {
         "type": "object"
      }
   }
}
```
