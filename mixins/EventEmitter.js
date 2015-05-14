var EventEmitter = require('events').EventEmitter;

var mixin = exports;

mixin.id = 'EventEmitter';

// methods to be added to the prototype
mixin.prototype = EventEmitter.prototype;

mixin.onCreate = function(model) {
    EventEmitter.call(model);
};

mixin.onSet = function(model, event) {
    model.emit('change', event);
    model.emit('change:' + event.propertyName, event);
};