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
- works with SSR

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
expect(Store.get()).toEqual({ foo: 'something_2', num: 2 });
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

### Subscription with dependencies
Sometimes you may want to subscribe your component to state that depends
on additional component state. This can be accomplished with the typical
dependency array most of us got used to with most basic React hooks.
```tsx
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
```tsx
export const GreatArticle = () => {
    const { id, author, title } = useSub(({ article }) => article);
    const reviews = useSub(({ reviews }) => reviews);
    const [trailer, recommendation] = useSub(({ trailers, recommendations }) => [trailer[id], recommendations[id]], [id]);
    
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
You can use the store as is, but you will need to run all timers with jest because 
all updates of components are processed batched. The above test would become:
```tsx
describe('<MyExample />', () => {
    it('renders the stock', () => {
        jest.useFakeTimers();
        // initialization
        // feel free to use any-casts in your tests (but only there)
        Store.set({ article: { stock: 1337 } as any });

        // render with stock 1337 (see '@testing-library/react')
        const { container } = render(<MyExample />);
        expect(container.textContent).toBe('Article stock is: 1337');

        // update the stock
        Store.set({ article: { stock: 444 } as any });
        jest.runAllTimers();
        expect(container.textContent).toBe('Article stock is: 444');
    });
});
```

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: https://github.com/fdc-viktor-luft/react-use-sub/blob/master/LICENSE
[build-image]: https://img.shields.io/travis/fdc-viktor-luft/react-use-sub/master.svg?style=flat-square
[build-url]: https://travis-ci.com/fdc-viktor-luft/react-use-sub
[npm-image]: https://img.shields.io/npm/v/react-use-sub.svg?style=flat-square
[npm-url]: https://www.npmjs.org/package/react-use-sub
[coveralls-image]: https://coveralls.io/repos/github/fdc-viktor-luft/react-use-sub/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/fdc-viktor-luft/react-use-sub?branch=master
[prettier-image]: https://img.shields.io/badge/styled_with-prettier-ff69b4.svg
[prettier-url]: https://github.com/prettier/prettier
