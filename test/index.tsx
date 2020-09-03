import React from 'react';
import { render } from '@testing-library/react';
import { createStore } from '../src';

jest.useFakeTimers();

describe('createStore', () => {
    it('creates a store that can be updated', () => {
        const [useSub, Store] = createStore({ foo: 'bar', bar: 2 });

        expect(useSub).toBeInstanceOf(Function);
        expect(Store.get()).toEqual({ foo: 'bar', bar: 2 });

        // allows to supply undefined as fallback for "no update required"
        const currentData = Store.get();
        Store.set(undefined);
        Store.set(undefined);
        Store.set(() => undefined);
        Store.set(({ foo }) => {
            if (foo !== 'bar') return { foo: 'bar2' };
        });
        expect(Store.get()).toEqual({ foo: 'bar', bar: 2 });
        expect(Store.get()).toBe(currentData);

        Store.set({ foo: 'hop' });
        expect(Store.get()).toEqual({ foo: 'hop', bar: 2 });
        expect(Store.get()).not.toBe(currentData); // data reference changes on each update

        Store.set({ foo: 'hop again', bar: 3 });
        expect(Store.get()).toEqual({ foo: 'hop again', bar: 3 });

        // invalid property will be ignored
        // flow would even complain (see any-cast)
        Store.set({ ['what' as any]: 'hip' });
        expect(Store.get()).toEqual({ foo: 'hop again', bar: 3 });

        Store.set(({ foo, bar }) => ({ foo: foo + ' 2', bar: ++bar }));
        expect(Store.get()).toEqual({ foo: 'hop again 2', bar: 4 });

        // undefined is fine and has no effect
        // but null is treated as possible value, but bar is of type number
        // therefore the any cast is required
        Store.set({ foo: undefined, bar: null as any });
        expect(Store.get()).toEqual({ foo: 'hop again 2', bar: null });

        // now produce some errors
        // TS would save us -> see required any casts
        Store.set(({ foo, bar }) => ({ foo: bar as any, bar: foo as any }));
        expect(Store.get()).toEqual({ bar: 'hop again 2', foo: null });

        // type checks
        Store.get().foo as string;
        Store.get().bar as number;
    });

    it('allows nullable types', () => {
        const Store = createStore<{ foo: string | null }>({
            foo: 'bar',
        })[1];

        expect(Store.get()).toEqual({ foo: 'bar' });

        Store.set({ foo: null });
        expect(Store.get()).toEqual({ foo: null });

        Store.set({ foo: 'hop' });
        expect(Store.get()).toEqual({ foo: 'hop' });

        // type checks
        Store.get().foo as string | null;
    });

    it('subscribes to store changes for mapped objects', () => {
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
        jest.runAllTimers();
        expect(renderCount).toBe(1);

        // no new render when mapped prop produces same output
        Store.set({ bar: 4 });
        jest.runAllTimers();
        expect(renderCount).toBe(1);

        // only one rerender even if multiple things change
        Store.set({ foo: 'change coming', bar: 5 });
        jest.runAllTimers();
        expect(renderCount).toBe(2);
        expect(currentReceived).toEqual({
            fooMapped: 'change coming',
            barEven: false,
            foo: true,
        });

        // enqueues multiple calls to Store.set
        Store.set({ foo: 'update 1' });
        Store.set({ foo: 'update 2' });
        jest.runAllTimers();
        expect(renderCount).toBe(3); // only one render was necessary
        expect(currentReceived.fooMapped).toBe('update 2');

        // deletes subscription after unmount
        unmount();

        // no update will be triggered anymore
        Store.set({ foo: 'anything' });
        jest.runAllTimers();
        expect(renderCount).toBe(3);
    });

    it('subscribes to store changes for any other types', () => {
        const [useSub, Store] = createStore({
            foo: 'bar',
            bar: 2,
            hip: '',
            test: null as null | Array<string | void>,
        });
        let currentReceived: any = null;
        let currentReceived2: any = [];
        let renderCount = 0;
        const Dummy = () => {
            ++renderCount;
            currentReceived = useSub(({ foo, hip }) => `${foo} ${hip}`);
            currentReceived2 = useSub(({ test }) => test);
            return null;
        };
        const { unmount } = render(<Dummy />);

        expect(renderCount).toBe(1);
        expect(currentReceived).toBe('bar ');
        expect(currentReceived2).toBe(null);

        // no new render when unmapped prop gets updated
        Store.set({ bar: 777 });
        jest.runAllTimers();
        expect(renderCount).toBe(1);

        // no new render when mapped prop produces same output
        Store.set({ hip: '' });
        jest.runAllTimers();
        expect(renderCount).toBe(1);

        // only one rerender even if multiple things change
        Store.set({ hip: 'next' });
        jest.runAllTimers();
        expect(renderCount).toBe(2);
        expect(currentReceived).toBe('bar next');
        expect(currentReceived2).toBe(null);

        // enqueues multiple calls to Store.set
        Store.set({ foo: 'update 1' });
        Store.set({ test: ['here'] });
        Store.set({ foo: 'update 2' });
        jest.runAllTimers();
        expect(renderCount).toBe(3); // only one render was necessary
        expect(currentReceived).toBe('update 2 next');
        expect(currentReceived2).toEqual(['here']);

        // no new render when mapped array produces same output
        Store.set({ test: ['here'] });
        jest.runAllTimers();
        expect(renderCount).toBe(3);

        // updates if array length changes
        Store.set({ test: ['here', undefined] });
        jest.runAllTimers();
        expect(renderCount).toBe(4); // only one render was necessary
        expect(currentReceived2).toEqual(['here', undefined]);

        // deletes subscription after unmount
        unmount();

        // no update will be triggered anymore
        Store.set({ foo: 'anything' });
        jest.runAllTimers();
        expect(renderCount).toBe(4);
    });

    it('allows arbitrary mapper modifications', () => {
        const [useSub, Store] = createStore({ foo: 'bar' });
        let currentReceived: any = null;
        let renderCount = 0;
        const Dummy = ({ num, some }: { num: number; some: string }) => {
            ++renderCount;
            currentReceived = useSub(({ foo }) => `${foo} ${num} ${some}`, [num]);
            return null;
        };
        const { rerender } = render(<Dummy num={1} some="happy" />);

        // initial render
        expect(renderCount).toBe(1);
        expect(currentReceived).toBe('bar 1 happy');

        // rerender the component with different property value for num
        rerender(<Dummy num={2} some="happy" />);

        // the changed dep array let's you return the latest value
        expect(renderCount).toBe(2);
        expect(currentReceived).toBe('bar 2 happy');

        // rerender the component with no different property
        rerender(<Dummy num={2} some="happy" />);

        // the last change stays to be consistent
        expect(renderCount).toBe(3);
        expect(currentReceived).toBe('bar 2 happy');

        // the update of the store value still works and
        // updates only once
        Store.set({ foo: 'anything' });
        jest.runAllTimers();

        expect(renderCount).toBe(4);
        expect(currentReceived).toBe('anything 2 happy');

        // even with dep array no update, if mapped value did not change
        Store.set({ foo: 'anything' });
        jest.runAllTimers();
        expect(renderCount).toBe(4);

        // rerender the component with different property value for some
        rerender(<Dummy num={2} some="sad" />);

        // the dep array did not change, therefore we still return the old value
        expect(renderCount).toBe(5);
        expect(currentReceived).toBe('anything 2 happy');

        // rerender the component with different property value for num again
        rerender(<Dummy num={3} some="sad" />);

        // but after changing the dep array again the latest value for "some"
        // will be considered
        expect(renderCount).toBe(6);
        expect(currentReceived).toBe('anything 3 sad');
    });

    it('provides updated data for all external changes', () => {
        const [useSub, Store] = createStore({ foo: true });
        let currentReceived: any = null;
        let renderCount = 0;
        const Dummy = ({ bool }: { bool: boolean }) => {
            ++renderCount;
            currentReceived = useSub(({ foo }) => foo === bool, [bool]);
            return null;
        };
        const { rerender } = render(<Dummy bool={true} />);

        // initial render
        expect(renderCount).toBe(1);
        expect(currentReceived).toBe(true);

        // rerender the component with different bool
        rerender(<Dummy bool={false} />);

        // the dep array changed and the value needs to be recomputed
        expect(renderCount).toBe(2);
        expect(currentReceived).toBe(false);

        // update the store value so that we receive the original value which was also computed last time
        // but only by dependency change
        Store.set({ foo: false });
        jest.runAllTimers();

        expect(renderCount).toBe(3);
        expect(currentReceived).toBe(true);

        // does not re-render if the last store set wouldn't actually change the outcome
        Store.set({ foo: true });
        Store.set({ foo: false });
        jest.runAllTimers();

        expect(renderCount).toBe(3);
        expect(currentReceived).toBe(true);
    });
});
