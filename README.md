typed-model
===========
JavaScript library for defining types and their properties with support for wrapping/unwrapping and serialization/deserialization.

## Installation
```bash
npm install typed-model --save
```

## Overview
The `typed-model` module provides utility code for defining data model types.
These data model types provide helpful accessor methods (getters and setters)
for the properties defined for the model type.

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
Model definitions are JSON Schema and, when possible, similar
naming conventions were chosen. However, this module is more tailored to runtime
usage. If desired, you can convert your model definitions to a JSON Schema
representation fairly easily. See [JSON Schema section](#json-schema) for more
information.

## Usage

### Requiring
```javascript
// Requiring the base Model type
var Model = require('typed-model/Model');

// Requiring the Enum type factory
var Enum = require('typed-model/Enum');

// Convenience function to create new Model
var NewModel = require('typed-model').create({/* config */});

// Convenience function to create new Enum type
var NewEnum = require('typed-model').createEnum({/* config */});
```

### Primitive Types
The following primitive types are supported:
- **Date Type:** `Date` / `"date"` / `require("typed-model/Date")`
- **Boolean Type:** `Boolean` / `"boolean"` / `require("typed-model/Boolean")`
- **Number Type:** `Number` / `"number"` / `require("typed-model/Number")`
- **Integer Type:** `"integer"` / `require("typed-model/Integer")`
- **String Type:** `String` / `"string"` / `require("typed-model/String")`
- **Array Type:** `Array` / `[]` / `"array"` / `require("typed-model/Array")`

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
	email: String
});
```

The new `Person` type will recognize `email` (defined for `Person`) and
`id` (defined for `Entity`) as properties.

```javascript
var person = new Person();
person.setId('john-doe');
person.setEmail('john.doe@example.com');
```

You can also create getters for "computed" properties.

**For example:**
```javascript
var Person = Entity.extend({
    properties: {
        firstName: String,
    	lastName: String,
    	displayName: {
    		type: String
    		get: function(property) {
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
	firstName: {
		type: String,
		set: function(property, value) {
			this.data[property] = value;
			_updateDisplayName(this);
		}
	},
	lastName: {
		type: String,
		set: function(property, value) {
			this.data[property] = value;
			_updateDisplayName(this);
		}
	},
	// displayName is updated whenever firstName or lastName change
	displayName: {
		type: String,
		persist: false
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

`Model.unwrap(obj)` can be safely called with any object. If the
given `obj` is a model then it will be unwrapped via `obj.unwrap()`.
If the given `obj` is not a model then the `obj` will simply be
returned.

`SomeType.wrap(obj)` can be used to ensure that the given obj is
wrapped as `SomeType`. If `obj` is already `SomeType` then `obj`
will simply be returned.

Note, an unwrapped object that has been previously wrapped will
have a `$model` property inside of it that stores a cached value
of the actual model instance. This allows for very efficient
wrapping and unwrapping without creating a lot of new objects
in the heap. If you want to ensure that your model is not
"polluted" with this metadata then use `obj.clean()` or
`Model.clean(obj)` which will create a cloned version of `obj`
without any extra metadata or non-persisted properties.

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
all non-persisted properties and metadata have been removed.

```javascript
var address = new Address({
	city: 'San Francisco',
	state: 'CA'
});

// When saving a model object to disk or storage, use clean to remove
// unnecessary fields.
db.save(address.clean(), callback);
```

### toJSON

The JavaScript language allows overriding the default behavior for
creating the intermediate object that is stringified via `JSON.stringify(obj)`.
Instances of `Model` implement `toJSON()` such that a cleaned copy
of the model is created. That is, `model.toJSON()` is equivalent to
`model.clean()`.

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
The `Date` coerce function provided by `typed-model` automatically convert
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

```javascript
var Color = Enum.create({
	values: ['red', 'green', 'blue']
});

// The following assertions will be true
assert(Color.RED.isRed());
assert(Color.RED.value() === 'red');
assert(Color.RED.clean() === 'red');
```

### Array Type

**Syntax:**
```javascript
var Color = Enum.create({
	values: ['red', 'green', 'blue']
});

var ColorPalette = Model.extend({
	properties: {.
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

var colors = [];

// getColors() will return an Array and we can use the "forEach" function.
// Each item in the array must be wrapped with the correct type.
colorPalette.getColors().forEach(function(color, index) {
    color = Color.wrap(color);
	colors[index] = color;
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
var jsonSchema = require('typed-model/json-schema-draft4');
var someModelSchema = jsonSchema.fromModel(SomeModel, options);
```

| Option | Type | Purpose |
| ------ | ---- | ------- |
| `toRef` | `function(Model)` | This function can be used to turn a Model definition to a reference name (return value will be used as value for `$ref` properties) |
| `isIgnoredProperty` | `function(name, property)` | This function can be used to exclude a property from the schema definition of a complex object |


#### Convert Model to JSON Schema

**Define your models:**
```javascript
var Model = require('typed-model/Model');
var Enum = require('typed-model/Enum');

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
var jsonSchema = require('typed-model/json-schema-draft4');
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


