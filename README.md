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
- Very small package size ([< 1kB gzipped](https://bundlephobia.com/result?p=react-use-sub))
- Much better performance than react-redux
- works with [SSR](#SSR)

### Examples
```tsx
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

// signature (almost) equally to the Setter function of useState
Store.set({ foo: 'something' });
// or functional
Store.set(({ foo }) => ({ foo: foo + '_2' }));
// this updates the stored data
// and updates all components that would be passed
// different values from the subscribed store mapper
expect(Store.get()).toEqual({ foo: 'something_2', num: 2 });

// or listen to any changes
// all below mentioned optimizations listed for "useSub" apply also to these listeners
const removeListener = Store.listen(({ foo }) => foo, (nextFoo, prevFoo) => {
    // will be only called if "nextFoo !== prevFoo" so you don't need to check this
    if (nextFoo.length > prevFoo.length) {
        alert('foo is growing');
    }
});
// and you can unsubscribe by calling the returned callback
removeListener();
```

## Hints
Let me introduce you to some interesting things.
### Optional types
Since version [2.0.0](https://github.com/fdc-viktor-luft/react-use-sub/blob/master/CHANGELOG.md#200---2021-03-21) you
can simply specify the optional type you want.
```ts
type State = { lastVisit?: Date };
type State = { lastVisit: null | Date };
```

### Conditional updates
When calling `Store.set` with `undefined` or a function that returns `undefined` has
no effect and performs no update.
```ts
// only update the stock if articles are present
Store.set(articles.length ? { stock: articles.length } : undefined);
// but this easy example could/should be rewritten to
articles.length && Store.set({ stock: articles.length });

// this feature comes more handy in examples like this
Store.set(({ articles }) => (articles.length ? { stock: articles.length } : undefined));
// or equivalent
Store.set(({ articles }) => {
    if (articles.length) {
        return { stock: articles.length };
    }
});
```

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
```tsx
export const GreatArticle = () => {
    const { id, author, title } = useSub(({ article }) => article);
    const reviews = useSub(({ reviews }) => reviews);
    const [trailer, recommendation] = useSub(({ trailers, recommendations }) => [trailer[id], recommendations[id]]);
    
    return <>...</>;
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

### Multiple stores
You can instantiate as many stores as you like, but make sure you don't create
your own hell with too many convoluted stores to subscribe.
```ts
import { createStore } from 'react-use-sub';

export const [useArticleSub, ArticleStore] = createStore(initialArticleState);

export const [useCustomerSub, CustomerStore] = createStore(initialCustomerState);

export const [useEventSub, EventStore] = createStore(initialEventState);
```

### Improve IDE auto-import
If you're exporting `useSub` and `Store` like mentioned in the
example above, your IDE most likely doesn't suggest importing those
while typing inside some component. To achieve this you could do the
following special trick.
```ts
const [useSub, Store] = createStore(initialState);

export { useSub, Store };
```

### Persisting data on the client
Because of the simplicity of this library, there are various ways how to persist data. One
example could be a custom hook persisting into the local storage.

```ts
const usePersistArticles = () => {
    const articles = useSub(({ articles }) => articles);

    useEffect(() => {
        localStorage.setItem('articles', JSON.stringify(articles));
    }, [articles]);
};

// and if you want to initialize your store with this data on page reload
const localStorageArticles = localStorage.getItem('articles');
const initialState = {
    articles: localStorageArticles ? JSON.parse(localStorageArticles) : {},
}

const [useSub, Store] = createStore(initialState);
```

You can also initialize the data lazy inside another effect of the custom hook. You can
use `IndexedDB` if you need to store objects that are not lossless serializable to JSON.
You can use `sessionStorage` or `cookies` depending on your use case. No limitations.

### Middlewares
It's totally up to you to write any sorts of middleware. One example of tracking special
state updates:
```ts
import { createStore, StoreSet } from 'react-use-sub';

type State = { conversionStep: number };
const initialState: State = { conversionStep: 1 };

const [useSub, _store] = createStore<State>(initialState);

// here comes the middleware implementation
const set: StoreSet<State> = (update) => {
    const prevState = _store.get();
    _store.set(update);
    const state = _store.get();
    if (prevState.conversionStep !== state.conversionStep) {
        trackConversionStep(state.conversionStep)
    }
}

// you can also add a reset functionality for Store which is very convenient for logouts
// with or without tracking. It's all up to you.
const Store = { ..._store, set, reset: () => _store.set(initialState) };

export { useSub, Store };
```
Yes, I know, it's basically just a higher order function. But let's keep things simple.

#### Example: Immer integration
[Immer](https://immerjs.github.io/immer/) is a package that allows to perform immutable 
operations while writing mutable ones. Making it less cumbersome to update deeply nested
data. It is roughly [8x the size](https://bundlephobia.com/package/immer@9.0.14) of this lib,
but still not extremely large. So you might consider using it to improve readability of your
code. There is no real need for it, but here's an example of how you could achieve an
integration very easily.
```ts
import immerProduce from 'immer';

const produce = (fn: (current: State) => void): void =>
    _store.set((current) => immerProduce(current, fn));

const Store = { ..._store, produce };

// and now in other code you can do

Store.produce((state) => {
    state.items.push({ name: 'new' });
})
```


### Testing
You don't need to mock any functions in order to test the integration of
the store. There is "test-util" that will improve your testing experience a lot.
The only thing you need to do is importing it. E.g. by putting it into your "setupTests" file.
```ts
import 'react-use-sub/test-util';
```
Possible downsides: Some optimizations like batched processing of all updates will be disabled.
You won't notice the performance impact in your tests, but you should not relay on the number
of renders caused by the store.

Testing would look like this
```tsx
// in some component
export const MyExample: React.FC = () => {
    const stock = useSub(({ article: { stock } }) => stock);

    return <span>Article stock is: {stock}</span>;
};

describe('<MyExample />', () => {
    it('renders the stock', () => {
        // initialization
        // feel free to use any-casts in your tests (but only there)
        Store.set({ article: { stock: 1337 } as any });

        // render with stock 1337 (see '@testing-library/react')
        const { container } = render(<MyExample />);
        expect(container.textContent).toBe('Article stock is: 1337');

        // update the stock (not need to wrap into "act", it's already done for you)
        Store.set({ article: { stock: 444 } as any });
        expect(container.textContent).toBe('Article stock is: 444');
    });
});
```

### Testing (without "test-util")
You can use the store as is, but you will need "wait" until the update was processed.
The above test would become:
```tsx

const nextTick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('<MyExample />', () => {
    it('renders the stock', async () => {
        // initialization
        // feel free to use any-casts in your tests (but only there)
        Store.set({ article: { stock: 1337 } as any });

        // render with stock 1337 (see '@testing-library/react')
        const { container } = render(<MyExample />);
        expect(container.textContent).toBe('Article stock is: 1337');

        // update the stock
        Store.set({ article: { stock: 444 } as any });
        await nextTick();
        expect(container.textContent).toBe('Article stock is: 444');
    });
});
```

### SSR
For SSR you want to create a store instance that is provided by a React context. Otherwise, you'll
need to prevent store updates on singletons that live in the server scope and share state with other
requests. To do this you could basically create a `StoreProvider` like this one:

```tsx
import React, { useMemo } from 'react';
import { createStore, StoreType, UseSubType } from 'react-use-sub';

const initialState = { foo: 'bar', num: 2 };
type State = typeof initialState;
const Context = React.createContext<{ useSub: UseSubType<State>; store: StoreType<State> }>({} as any);

// those can be used everywhere on server- and client-side safely
export const useStore = (): StoreType<State> => React.useContext(Context).store;
export const useSub: UseSubType<State> = (...args) => React.useContext(Context).useSub(...args);

// this needs to wrap your whole application
export const StoreProvider: React.FC = ({ children }) => {
    const value = useMemo(() => {
        const [useSub, store] = createStore(initialState);
        return { useSub, store };
    }, []);
    
    return <Context.Provider value={value}>{children}</Context.Provider>;
};
```

You might have already guessed, that this has some caveats, because you would have to get first via
`useStore` the store in order to make updates or even provide it down in callbacks to perform these
updates any time later. But this is the complexity price to pay, when handling SSR. We need to make
sure that updates are not performed by the server that cause conflicts with other incoming requests.

The new hooks `useStore` and `useSub` however are not performing any worse because the React context
value is not updated after the initial render anymore.

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: https://github.com/fdc-viktor-luft/react-use-sub/blob/master/LICENSE
[build-image]: https://img.shields.io/travis/fdc-viktor-luft/react-use-sub/master.svg?style=flat-square
[build-url]: https://app.travis-ci.com/fdc-viktor-luft/react-use-sub
[npm-image]: https://img.shields.io/npm/v/react-use-sub.svg?style=flat-square
[npm-url]: https://www.npmjs.org/package/react-use-sub
[coveralls-image]: https://coveralls.io/repos/github/fdc-viktor-luft/react-use-sub/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/fdc-viktor-luft/react-use-sub?branch=master
[prettier-image]: https://img.shields.io/badge/styled_with-prettier-ff69b4.svg
[prettier-url]: https://github.com/prettier/prettier
