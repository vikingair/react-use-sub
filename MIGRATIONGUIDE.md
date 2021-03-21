# Migration Guide
You can find here tips for migrating breaking changes.

## 2.0.0
Possible breaking change since the lax rule to ignore passed `undefined` values on
top-level were removed now. Migration tip:

```ts
// if "foo" has a required type "number" the following would break
Store.set({ lastSuccess: success ? Date.now() : undefined });

// instead you could do...
// alternative 1
Store.set(success ? { lastSuccess: Date.now() } : undefined);

// alternative 2
success && Store.set({ lastSuccess: Date.now() });

// alternative 3
const update = { lastSuccess: Date.now() };
// deleting a property is different from setting its value to undefined
// i.e. the key of the object will be unset
if (!success) delete update.lastSuccess;
Store.set(update);
```


