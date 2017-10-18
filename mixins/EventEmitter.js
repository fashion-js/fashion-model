const EventEmitter = require('events').EventEmitter;

const mixin = exports;

mixin.id = 'EventEmitter';

// methods to be added to the prototype
mixin.prototype = EventEmitter.prototype;

// init method is called when new instance is created and the scope
// of the function is the new instance
mixin.init = function () {
  EventEmitter.call(this);
};

/**
 * the onSet function is called which time a property value is changed
 * for a given model.
 * @param {Model} model a model instance whose property was changed
 * @param {Object} event data about the changed property
 */
mixin.onSet = function (model, event) {
  model.emit('change', event);
  model.emit('change:' + event.propertyName, event);
};
