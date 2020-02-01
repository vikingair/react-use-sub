[![GitHub license][license-image]][license-url]
[![npm package][npm-image]][npm-url] 
[![Travis][build-image]][build-url]
[![Coverage Status][coveralls-image]][coveralls-url]
[![styled with prettier][prettier-image]][prettier-url]

# react-use-sub

Subscription based lightweight React store.

### Benefits
- easy to use
- easy testing
- no dependencies
- no react context
- TypeScript support included
- Very small package size (< 1kB gzipped)
- Much better performance than react-redux

### Examples
```js
// >>> in your store.js
import { createStore } from 'react-use-sub';

const initialState = { foo: 'bar', num: 2 };
export const [useSub, Store] = createStore(initialState);

// >>> in any component
import { useSub } from '/path/to/store.js';

export const App = () => {
    // subscribe here your custom store mapper
    const { fooLength, num } = useSub(({ foo, num }) => ({ fooLength: foo.length, num }));
    const square = useSub(({ num }) => num**2);
    
    return <div>Magic number is: {fooLength * num * square}</div>;
}

// >>> in any other (or same) place
import { Store } from '/path/to/store.js';

// signature equally to the Setter function of useState
Store.set({ foo: 'something' });
// this updates the stored data
expect(Store.get()).toEqual({ foo: 'something', num: 2 });
// and updates all components that would be passed
// different values from the subscribed store mapper
```

## Hints
Let me introduce you to some interesting things.
### Optional types
Since TypeScript [can not distinguish](https://github.com/microsoft/TypeScript/issues/13195)
between missing fields and undefined values, you have to use `null` 
on top-level. Please don't use optional fields on top-level. Updates
with `undefined` on top-level will be simply ignored.
```ts
// BAD
type State = { lastVisit?: Date };

// GOOD
type State = { lastVisit: null | Date };
```

### Subscription with dependencies
Sometimes you may want to subscribe your component to state that depends
on additional component state. This can be accomplished with the typical
dependency array most of us got used to with most basic React hooks.
```ts
export const FancyItem: React.FC<{ id: string }> = ({ id }) => {
    const { name, color } = useSub(({ items }) => items[id], [id]);
    
    return <div style={{ color }}>{name}</div>;
}
```
But you shouldn't provide an empty array as second argument to `useSub`,
since internal optimizations make this the default.

### Shallow equality optimization
The returned value of the defined mapper will be compared shallowly against
the next computed value to determine if some rerender is necessary. E.g.
following the example of the `App` component above:
```ts
// if Store.get().foo === 'bar'
Store.set({ foo: '123' });
// --> no rerender since "foo.length" did not change

// if Store.get().num === 3
Store.set({ num: 3 });
// --> no rerender since "num" did not change
```

### Multiple subscriptions in a single component
Please feel free to use multiple subscriptions in a single component.
```ts
export const GreatArticle = () => {
    const { id, author, title } = useSub(({ article }) => article);
    const reviews = useSub(({ reviews }) => reviews);
    const trailer = useSub(({ trailers, recommendations }) => [trailer[id], recommendations[id]], [id]);
    
    return (...);
}
```
Whenever a store update would trigger any of the above subscriptions the
component will be rerendered only once even if all subscriptions would
return different data. That's a pretty important capability when thinking
about custom hooks that subscribe to certain states.

### Multiple store updates
If you perform multiple store updates in the same synchronous task this
has (almost) no negative impact on your performance and leads not to any
unnecessary rerenders. All updates will be enqueued, processed in the next
tick and batched to minimize the necessary rerenders.
```ts
Store.set({ foo: 'bar' });
Store.set({ num: 2 });
Store.set({ lastVisit: new Date() });
```

### Improve IDE auto-import
If you're exporting `useSub` and `Store` like mentioned in the
example above, your IDE most likely doesn't suggest to import those
while typing inside some component. To achieve this you could do the
following special trick.
```ts
const [useSub, Store] = createStore(initialState);

export { useSub, Store };
```

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: https://github.com/fdc-viktor-luft/react-use-sub/blob/master/LICENSE
[build-image]: https://img.shields.io/travis/fdc-viktor-luft/react-use-sub/master.svg?style=flat-square
[build-url]: https://travis-ci.org/fdc-viktor-luft/react-use-sub
[npm-image]: https://img.shields.io/npm/v/react-use-sub.svg?style=flat-square
[npm-url]: https://www.npmjs.org/package/react-use-sub
[coveralls-image]: https://coveralls.io/repos/github/fdc-viktor-luft/react-use-sub/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/fdc-viktor-luft/react-use-sub?branch=master
[prettier-image]: https://img.shields.io/badge/styled_with-prettier-ff69b4.svg
[prettier-url]: https://github.com/prettier/prettier
