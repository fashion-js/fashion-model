CHANGELOG
=========

# 6.x

## 6.0.x

### 6.0.0

- BREAKING: Switched to ES6 syntax (`async`/`await`, `for ... of`, `const`/`let`, `Object.defineProperty(...)`).
- BREAKING: `"object"` or `Object` type will now validate values using `typeof value === 'object'`.
- BREAKING: When parsing ISO date strings without `Z` suffix, the computer's time zone will be used (use to use always use UTC).
- Switched from `mocha` to `ava` test runner
- Introduced `"any"` or `{}` type which places no restriction on value.

**USAGE:** Specifying properties whose value can be anything.

```javascript
const Something = Entity.extend({
  properties: {
    anything1: {},
    anything2: 'any',
    arrayOfAnything1: [],
    arrayOfAnything2: [{}]
  }
});
```
