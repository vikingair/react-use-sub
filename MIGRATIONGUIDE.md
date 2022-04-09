# Migration Guide
You can find here tips for migrating breaking changes.

## next
Breaking changes are that you will need to install React 18.
Also `useSub` now doesn't require the definition of external dependencies anymore.
```tsx
// before
export const FancyItemPrev: React.VFC<{ id: string }> = ({ id }) => {
    const { name, color } = useSub(({ items }) => items[id], [id]);

    return <div style={{ color }}>{name}</div>;
}

// now
export const FancyItemNext: React.VFC<{ id: string }> = ({ id }) => {
    const { name, color } = useSub(({ items }) => items[id]);

    return <div style={{ color }}>{name}</div>;
}
```

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


