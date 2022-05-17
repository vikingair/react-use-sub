# Migration Guide
You can find here tips for migrating breaking changes.

## next
Breaking changes are that you will need to install React 18.
Also `useSub` now doesn't require the definition of external dependencies anymore.
```tsx
// before
export const FancyItemPrev: React.FC<{ id: string }> = ({ id }) => {
    const { name, color } = useSub(({ items }) => items[id], [id]);

    return <div style={{ color }}>{name}</div>;
}

// now
export const FancyItemNext: React.FC<{ id: string }> = ({ id }) => {
    const { name, color } = useSub(({ items }) => items[id]);

    return <div style={{ color }}>{name}</div>;
}
```

In addition, the new mechanism using the new `useSyncExternalStore` will make subscriptions 
fail if you use mapper functions that don't produce shallow equal objects. Previously, this
was just silently causing always updating components on all store updates. But now this is
necessary to fix. The errors you will see, once you run into it, are looking like these:

```
Warning: The result of getSnapshot should be cached to avoid an infinite loop
```
```
Uncaught Error: Maximum update depth exceeded. 
This can happen when a component repeatedly calls setState inside componentWillUpdate 
or componentDidUpdate. React limits the number of nested updates to prevent infinite loops
```

An example demonstrates how to fix this issue.
```tsx
// before
export const FancyItemsPrev: React.FC = () => {
    // "extendedItems" is not shallow comparable as it contains new created objects 
    const extendedItems = useSub(({ items }) => items.map((item) => ({ ...items, key: item.color + item.name })));

    return (
        <>
            {extendedItems.map(({ color, name, key }) => (<div key={key} style={{ color }}>{name}</div>))}
        </>
    );
}

// now
export const FancyItemsNext: React.FC = () => {
    const items = useSub(({ items }) => items);
    // "extendedItems" can be computed with "useMemo" using the "items" from the store
    const extendedItems = useMemo(() => items.map((item) => ({ ...items, key: item.color + item.name })), [items]);

    return (
        <>
            {extendedItems.map(({ color, name, key }) => (<div key={key} style={{ color }}>{name}</div>))}
        </>
    );
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


