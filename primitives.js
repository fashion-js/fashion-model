var ArrayType = require('./Array');
[
    ArrayType,
    require('./Boolean'),
    require('./Date'),
    require('./Integer'),
    require('./Number'),
    require('./String'),
    require('./Object'),
    require('./Function')
].forEach(function(PrimitiveType) {
    exports[PrimitiveType.typeName] = PrimitiveType;
});
