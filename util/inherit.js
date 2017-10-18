function copyProps (from, to) {
  Object.getOwnPropertyNames(from).forEach(function (name) {
    const descriptor = Object.getOwnPropertyDescriptor(from, name);
    Object.defineProperty(to, name, descriptor);
  });
}

function inherit (ctor, superCtor) {
  const oldProto = ctor.prototype;
  const newProto = ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      writable: true,
      configurable: true
    }
  });
  copyProps(oldProto, newProto);
  ctor.$super = superCtor;
  ctor.prototype = newProto;
  return ctor;
}

module.exports = inherit;
inherit._inherit = inherit;
