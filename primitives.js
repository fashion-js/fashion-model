function isPrimitive () {
  return true;
}

[
  require('./Array'),
  require('./Boolean'),
  require('./Date'),
  require('./Integer'),
  require('./Number'),
  require('./String'),
  require('./Object'),
  require('./Any'),
  require('./Function')
].forEach(function (PrimitiveType) {
  PrimitiveType.isPrimitive = isPrimitive;
  exports[PrimitiveType.typeName] = PrimitiveType;
});
