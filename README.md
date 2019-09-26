[![GitHub license][license-image]][license-url]
[![styled with prettier][prettier-image]][prettier-url]

# react-use-sub

WIP: Subscription based lightweight React store

How it looks:
```js
// >>> in your store.js
import { createStore } from 'react-use-sub';

const initialState = { foo: 'bar' };
export const [useSub, Store] = createStore(initialState);

// >>> in any component
import { useSub } from '/path/to/store.js';

export const App = () => {
    // subscribe here your custom store mapper
    const { fooLength } = useSub(({ foo }) => ({ fooLength: foo.length }));
    
    return <div>Foo has length: {fooLength}</div>;
}

// >>> in any other (or same) place
import { Store } from '/path/to/store.js';

// signature equally to the Setter function of useState
Store.set({ foo: 'something' });
// this updates the stored data
expect(Store.get()).toEqual({ foo: 'something' });
// and updates all components that would be passed
// different values from the subscribed store mapper
```

My Goals:
- No context
- TypeScript support
- Flow support
- Very small package size (513 bytes)
- No dependencies
- Very easy to use
- Better performance than React-Redux
- Scalability

Treat-offs:
- You need React v16.8 or greater
- It does not work for class components

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: https://github.com/fdc-viktor-luft/form4react/blob/master/LICENSE
[prettier-image]: https://img.shields.io/badge/styled_with-prettier-ff69b4.svg
[prettier-url]: https://github.com/prettier/prettier
