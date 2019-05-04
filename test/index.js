// @flow

import React from 'react';
import { render, act } from 'react-testing-library';
import { createStore } from '../src';

describe('createStore', () => {
    it('creates a store that can be updated', () => {
        const [useSub, Store] = createStore({ foo: 'bar', bar: 2 });

        expect(useSub).toBeInstanceOf(Function);
        expect(Store.get()).toEqual({ foo: 'bar', bar: 2 });

        Store.set({ foo: 'hop' });
        expect(Store.get()).toEqual({ foo: 'hop', bar: 2 });

        Store.set({ foo: 'hop again', bar: 3 });
        expect(Store.get()).toEqual({ foo: 'hop again', bar: 3 });

        // invalid property will be ignored
        // flow would even complain (see any-cast)
        Store.set({ [('what': any)]: 'hip' });
        expect(Store.get()).toEqual({ foo: 'hop again', bar: 3 });

        Store.set(({ foo, bar }) => ({ foo: foo + ' 2', bar: ++bar }));
        expect(Store.get()).toEqual({ foo: 'hop again 2', bar: 4 });

        // undefined is fine and has no effect
        // but null is treated as possible value, but bar is of type number
        // therefore the any cast is required
        Store.set({ foo: undefined, bar: (null: any) });
        expect(Store.get()).toEqual({ foo: 'hop again 2', bar: null });

        // now produce some errors
        // flow would save us -> see required any casts
        Store.set(({ foo, bar }) => ({ foo: (bar: any), bar: (foo: any) }));
        expect(Store.get()).toEqual({ bar: 'hop again 2', foo: null });

        (Store.get().foo: string);
        (Store.get().bar: number);
    });

    it('allows nullable types', () => {
        const Store = createStore<{| foo: string | null |}>({
            foo: 'bar',
        })[1];

        expect(Store.get()).toEqual({ foo: 'bar' });

        Store.set({ foo: null });
        expect(Store.get()).toEqual({ foo: null });

        Store.set({ foo: 'hop' });
        expect(Store.get()).toEqual({ foo: 'hop' });

        (Store.get().foo: string | null);
    });

    it('subscribes to store changes', () => {
        const [useSub, Store] = createStore({ foo: 'bar', bar: 2, hip: '' });
        let currentReceived: any = {};
        let renderCount = 0;
        const Dummy = () => {
            ++renderCount;
            currentReceived = useSub(({ foo, bar }) => ({
                fooMapped: foo,
                barEven: bar % 2 === 0,
                foo: true,
            }));
            return null;
        };
        const { unmount } = render(<Dummy />);

        expect(renderCount).toBe(1);
        expect(currentReceived).toEqual({
            fooMapped: 'bar',
            barEven: true,
            foo: true,
        });

        // no new render when unmapped prop gets updated
        Store.set({ hip: 'whatever' });
        expect(renderCount).toBe(1);

        // no new render when mapped prop produces same output
        Store.set({ bar: 4 });
        expect(renderCount).toBe(1);

        // only one rerender even if multiple things change
        act(() => Store.set({ foo: 'change coming', bar: 5 }));
        expect(renderCount).toBe(2);
        expect(currentReceived).toEqual({
            fooMapped: 'change coming',
            barEven: false,
            foo: true,
        });

        // deletes subscription after unmount
        unmount();

        // no update will be triggered anymore
        Store.set({ bar: 5 });
        expect(renderCount).toBe(2);
    });
});
