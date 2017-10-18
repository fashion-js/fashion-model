function isPrimitive () {
  return true;
}

for (const PrimitiveType of [
  require('./Array'),
  require('./Boolean'),
  require('./Date'),
  require('./Integer'),
  require('./Number'),
  require('./String'),
  require('./Object'),
  require('./Any'),
  require('./Function')
]) {
  PrimitiveType.isPrimitive = isPrimitive;
  exports[PrimitiveType.typeName] = PrimitiveType;
}
