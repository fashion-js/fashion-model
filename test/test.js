var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

var Model = require('../Model');
var Enum = require('../Enum');

var Gender = Enum.create({
	values: ['M', 'F'],
	autoUpperCase: true
});

var Address = Model.extend({
    attributes: {
        'city': String,
        'state': String
    }
});

var Member = Model.extend({
    attributes: {
		email: String,
        dateCreated: Date,
        displayName: String,
        gender: Gender,
        address: Address
    }
});

describe('Model' , function() {
    it('should provide metadata', function() {
        var Person = Model.extend({
            attributes: {
                dateOfBirth: Date
            }
        });
        
        var DerivedPerson = Person.extend({
        });
        
        var Stub = Model.extend({
        });
        
        var DerivedStub = Stub.extend({
            attributes: {
                name: String
            }
        });
        
        var Simple = Stub.extend({
            attributes: {}
        });
        
        var ToString = Model.extend({
            wrap: false,
            coerce: function(value) {
                return (value == null) ? value : value.toString();
            }
        });
        
        expect(Person.hasAttributes()).to.equal(true);
        expect(Person.isWrapped()).to.equal(true);
        
        expect(DerivedPerson.hasAttributes()).to.equal(true);
        expect(DerivedPerson.isWrapped()).to.equal(true);
        
        expect(Stub.hasAttributes()).to.equal(false);
        expect(Stub.isWrapped()).to.equal(true);
        
        expect(DerivedStub.hasAttributes()).to.equal(true);
        expect(DerivedStub.isWrapped()).to.equal(true);
        
        expect(Simple.hasAttributes()).to.equal(false);
        expect(Simple.isWrapped()).to.equal(true);
        
        expect(ToString.hasAttributes()).to.equal(false);
        expect(ToString.isWrapped()).to.equal(false);
    });
    
    it('should handle Date type', function() {
        var Person = Model.extend({
            attributes: {
                dateOfBirth: Date
            }
        });

        var person = new Person();
        expect(person.Model.attributes.dateOfBirth.getName()).to.equal('dateOfBirth');
        person.setDateOfBirth(new Date(1980, 1, 1));
        expect(person.getDateOfBirth()).to.deep.equal(new Date(1980, 1, 1));
    });

    it('should provide setters', function() {
        var Person = Model.extend({
            attributes: {
                name: String,
                dateOfBirth: Date
            }
        });

        var person = new Person();
        person.setName('John Doe');
        person.setDateOfBirth(new Date(1980, 1, 1));
        
        expect(person.getName()).to.equal('John Doe');
        expect(person.getDateOfBirth()).to.deep.equal(new Date(1980, 1, 1));
        
        
        
        var rawPerson = person.unwrap();
        expect(rawPerson.name).to.equal('John Doe');
        expect(rawPerson.dateOfBirth).to.deep.equal(new Date(1980, 1, 1));
    });

    it('should allow wrapping existing', function() {
        var Person = Model.extend({
            attributes: {
                name: String,
                dateOfBirth: Date
            }
        });

        var rawPerson = {
            name: 'John Doe',
            dateOfBirth: new Date(1980, 1, 1)
        };
        
        var person = new Person(rawPerson);
        person.setName('Jane Doe');
        
        // raw person should also reflect any changes
        expect(rawPerson.name).to.equal('Jane Doe');
        expect(rawPerson.dateOfBirth).to.deep.equal(new Date(1980, 1, 1));
    });

    it('should allow custom property names', function() {
        var Entity = Model.extend({
            attributes: {
                id: {
                    type: String,
                    property: '_id'
                }
            }
        });

        var Person = Entity.extend({
            attributes: {
                name: String,
                dateOfBirth: Date
            }
        });

        var person = new Person({
            _id: 'test',
            name: 'John Doe',
            dateOfBirth: new Date(1980, 1, 1)
        });
        
        expect(person.getId()).to.equal('test');
    });
    
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
            attributes: {
                id: NumericId
            }
        });
        
        var product = new Product({
            id: '123'
        });
        
        expect(product.getId()).to.equal(123);
    });
    
    it('should allow stringify', function() {
        var member = new Member({
            email: 'jane.doe@example.com',
            displayName: 'Jane',
            address: {
                city: 'Durham',
                state: 'NC'
            }
        });
        
        expect(member.stringify()).to.equal(JSON.stringify({
            email: 'jane.doe@example.com',
            displayName: 'Jane',
            address: {
                city: 'Durham',
                state: 'NC'
            }
        }));
    });
    
    it('should properly stringify an array of models', function() {
        var Person = Model.extend({
            attributes: {
                name: String
            }
        });
        
        var people = [
            Person.wrap({
                name: 'John'
            }),
            Person.wrap({
                name: 'Sally'
            })
        ];
        
        expect(Model.stringify(people)).to.equal(JSON.stringify([
            {
                name: 'John'
            },
            {
                name: 'Sally'
            }
        ]));
    });
    
    it('should allow efficient wrapping and unwrapping', function() {
        var Person = Model.extend({
            attributes: {
                name: String
            }
        });
        
        var rawPerson = {
            name: 'John'
        };
        
        expect(Person.hasAttributes()).to.equal(true);
        
        var person = Person.wrap(rawPerson);
        
        // unwrap person to get the original raw object
        expect(Model.unwrap(person)).to.equal(rawPerson);
        
        // if you have the raw object then wrapping it will return
        // the existing wrapper (and not create a new object)
        expect(Person.wrap(rawPerson)).to.equal(person);
    });
    
    it('should allow cleaning of "hidden" model properties from raw data', function() {
        var Entity = Model.extend({
            attributes: {
                id: {
                    type: String,
                    property: '_id'
                }
            }
        });
        
        var Address = Model.extend({
            attributes: {
                city: String,
                state: String
            }
        });
        
        var Person = Entity.extend({
            attributes: {
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
                state: 'NC'
            })
        });
        
        expect(Model.clean(person)).to.deep.equal({
            _id: 'test',
            name: 'John Doe',
            dateOfBirth: new Date(1980, 1, 1),
            address: {
                city: 'Durham',
                state: 'NC'
            }
        });
    });
    
    it('should allow enum type models', function() {
        var Person = Model.extend({
            attributes: {
                gender: Gender
            }
        });
        
        expect(function() {
            (new Gender('X')).toString();
        }).to.throw(Error);
        
        expect(Gender.M.data).to.equal('M');
        expect(Gender.F.data).to.equal('F');
        
        expect(Gender.wrap('F').isF()).to.equal(true);
        
        expect(Gender.M.isM()).to.equal(true);
        expect(Gender.M.isF()).to.equal(false);
        
        expect(Gender.F.isM()).to.equal(false);
        expect(Gender.F.isF()).to.equal(true);
        
        var person1 = new Person({
            gender: 'F'
        });
        
        //expect(person1.data.gender).to.equal
        
        expect(person1.getGender().isF()).to.equal(true);
        
        var person2 = new Person();
        person2.setGender('M');
        
        expect(person2.getGender().isM()).to.equal(true);
        expect(person2.getGender().isF()).to.equal(false);
    });
    
    it('should allow opaque wrapper type', function() {
        var Token = Model.extend({});
        
        var token = new Token({
            a: 1,
            b: 2
        });
        
        expect(token.data).to.deep.equal({
            a: 1,
            b: 2
        });
        
        var raw = token.unwrap();
        
        expect(raw.a).to.equal(1);
        expect(raw.b).to.equal(2);
        
        expect(token.clean()).to.deep.equal({
            a: 1,
            b: 2
        });
    });
	
	it('should support simplified array type', function() {
		
		var Color = Enum.create({
			values: ['red', 'green', 'blue']
		});
		
		expect(Color.RED.clean()).to.equal('red');
		expect(Color.RED.value()).to.equal('red');
		
        var ColorPalette = Model.extend({
			attributes: {
				colors: [Color]
			}
		});
		
		var colorPalette = new ColorPalette({
			colors: ['red', 'green', 'blue']
		});
		
		var colors = [];
		colorPalette.forEachColor(function(color, index) {
			expect(color.constructor).to.equal(Color);
			colors[index] = color;
		});
		
		expect(colors.length).to.equal(3);
		expect(colors[0]).to.equal(Color.RED);
		expect(colors[1]).to.equal(Color.GREEN);
		expect(colors[2]).to.equal(Color.BLUE);
		
		expect(colorPalette.getColor(0)).to.equal(Color.RED);
		expect(colorPalette.getColor(1)).to.equal(Color.GREEN);
		expect(colorPalette.getColor(2)).to.equal(Color.BLUE);
    });
	
	it('should support "singular" property for array type', function() {
		
		
        var Team = Model.extend({
			attributes: {
				people: {
					type: [Member],
					singular: 'person'
				}
			}
		});
		
		var team = new Team({
			people: [
				{
					displayName: 'John'
				},
				{
					displayName: 'Jane'
				}
			]
		});
		
		var teamMembers = [];
		team.forEachPerson(function(person, index) {
			expect(person.constructor).to.equal(Member);
			teamMembers[index] = person;
		});
		
		expect(teamMembers.length).to.equal(2);
		expect(teamMembers[0].getDisplayName()).to.equal('John');
		expect(teamMembers[1].getDisplayName()).to.equal('Jane');
		
		expect(team.getPerson(0).getDisplayName()).to.equal('John');
		expect(team.getPerson(1).getDisplayName()).to.equal('Jane');
    });
});
