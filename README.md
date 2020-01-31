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
