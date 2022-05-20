import React from 'react';
import { act, render } from '@testing-library/react';
import { createStore, _config } from '../src';

const nextTick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('createStore', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        process.env.NODE_ENV = 'test';
    });

    it('creates a store that can be updated', () => {
        const [useSub, Store] = createStore({ foo: 'bar', bar: 2 });

        expect(useSub).toBeInstanceOf(Function);
        expect(Store.get()).toEqual({ foo: 'bar', bar: 2 });

        // allows supplying undefined as fallback for "no update required"
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

        // invalid property will NOT be ignored
        // @ts-ignore
        Store.set({ what: 'hip' });
        expect(Store.get()).toEqual({ foo: 'hop again', bar: 3, what: 'hip' });
        // @ts-ignore
        Store.set({ what: undefined }); // clear it again

        Store.set(({ foo, bar }) => ({ foo: foo + ' 2', bar: ++bar }));
        expect(Store.get()).toEqual({ foo: 'hop again 2', bar: 4 });

        // undefined and null is treated as possible value, but bar is of type number
        // therefore the any cast is required
        Store.set({ foo: undefined as any, bar: null as any });
        expect(Store.get()).toEqual({ foo: undefined, bar: null });

        // now produce some errors
        // TS would save us -> see required any casts
        Store.set(({ foo, bar }) => ({ foo: bar as any, bar: foo as any }));
        expect(Store.get()).toEqual({ bar: undefined, foo: null });

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
        const typeCheck: string | null = Store.get().foo;
        expect(typeCheck).toBe('hop');
    });

    it('allows undefined types', () => {
        const Store = createStore<{ foo?: string }>({
            foo: 'bar',
        })[1];

        expect(Store.get()).toEqual({ foo: 'bar' });

        Store.set({ foo: undefined });
        expect(Store.get()).toEqual({ foo: undefined });

        Store.set({ foo: 'hop' });
        expect(Store.get()).toEqual({ foo: 'hop' });

        // type checks
        const typeCheck: string | undefined = Store.get().foo;
        expect(typeCheck).toBe('hop');
    });

    it('subscribes to store changes for mapped objects', async () => {
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
        Store.set({ foo: 'change coming', bar: 5 });
        await act(nextTick);
        expect(renderCount).toBe(2);
        expect(currentReceived).toEqual({
            fooMapped: 'change coming',
            barEven: false,
            foo: true,
        });

        // enqueues multiple calls to Store.set
        Store.set({ foo: 'update 1' });
        Store.set({ foo: 'update 2' });
        await act(nextTick);
        expect(renderCount).toBe(3); // only one render was necessary
        expect(currentReceived.fooMapped).toBe('update 2');

        // deletes subscription after unmount
        unmount();

        // no update will be triggered anymore
        Store.set({ foo: 'anything' });
        await act(nextTick);
        expect(renderCount).toBe(3);
    });

    it('subscribes to store changes for any other types', async () => {
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
        await act(nextTick);
        expect(renderCount).toBe(1);

        // no new render when mapped prop produces same output
        Store.set({ hip: '' });
        await act(nextTick);
        expect(renderCount).toBe(1);

        // only one rerender even if multiple things change
        Store.set({ hip: 'next' });
        await act(nextTick);
        expect(renderCount).toBe(2);
        expect(currentReceived).toBe('bar next');
        expect(currentReceived2).toBe(null);

        // enqueues multiple calls to act(() =>Store.se)t
        Store.set({ foo: 'update 1' });
        Store.set({ test: ['here'] });
        Store.set({ foo: 'update 2' });
        await act(nextTick);
        expect(renderCount).toBe(3); // only one render was necessary
        expect(currentReceived).toBe('update 2 next');
        expect(currentReceived2).toEqual(['here']);

        // no new render when mapped array produces same output
        Store.set({ test: ['here'] });
        await act(nextTick);
        expect(renderCount).toBe(3);

        // updates if array length changes
        Store.set({ test: ['here', undefined] });
        await act(nextTick);
        expect(renderCount).toBe(4); // only one render was necessary
        expect(currentReceived2).toEqual(['here', undefined]);

        // deletes subscription after unmount
        unmount();

        // no update will be triggered anymore
        Store.set({ foo: 'anything' });
        await act(nextTick);
        expect(renderCount).toBe(4);
    });

    it('allows arbitrary mapper modifications', async () => {
        const [useSub, Store] = createStore({ foo: 'bar' });
        let currentReceived: any = null;
        let renderCount = 0;
        const Dummy = ({ num, some }: { num: number; some: string }) => {
            ++renderCount;
            currentReceived = useSub(({ foo }) => `${foo} ${num} ${some}`);
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
        await act(nextTick);

        expect(renderCount).toBe(4);
        expect(currentReceived).toBe('anything 2 happy');

        // even with dep array no update, if mapped value did not change
        Store.set({ foo: 'anything' });
        await act(nextTick);
        expect(renderCount).toBe(4);

        // rerender the component with different property for "some"
        rerender(<Dummy num={2} some="sad" />);

        // then
        expect(renderCount).toBe(5);
        expect(currentReceived).toBe('anything 2 sad');
    });

    it('provides updated data for all external changes', async () => {
        const [useSub, Store] = createStore({ foo: true });
        let currentReceived: any = null;
        let renderCount = 0;
        const Dummy = ({ bool }: { bool: boolean }) => {
            ++renderCount;
            currentReceived = useSub(({ foo }) => foo === bool);
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
        await act(nextTick);

        expect(renderCount).toBe(3);
        expect(currentReceived).toBe(true);

        // does not re-render if the last store set wouldn't actually change the outcome
        Store.set({ foo: true });
        Store.set({ foo: false });
        await act(nextTick);

        expect(renderCount).toBe(3);
        expect(currentReceived).toBe(true);
    });

    it('allows to listen upon store changes', async () => {
        const spy = jest.fn();
        const [, Store] = createStore({ foo: 'bar', num: 42 });
        const waitForBatchAndDispatch = async () => {
            await nextTick();
            await nextTick();
        };

        // when
        const removeListener = Store.listen(
            ({ foo, num }) => ({ odd: num % 2 === 1, fooLength: foo.length }),
            (next, prev) => {
                // don't make it shorter by putting the spy as listener, because we are also testing the TS integration
                spy({
                    odd: next.odd,
                    fooLength: next.fooLength,
                    prevOdd: prev.odd,
                    prevFooLength: prev.fooLength,
                });

                // return value will be ignored and can be of any type
                return 'foo';
            }
        );

        // initially
        expect(spy).not.toHaveBeenCalled();

        // when - updating without changing the length of "foo"
        Store.set({ foo: 'wha' });
        await waitForBatchAndDispatch();

        // then
        expect(spy).not.toHaveBeenCalled();

        // when - updating length of "foo"
        Store.set({ foo: 'what' });
        await waitForBatchAndDispatch();

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith({ odd: false, fooLength: 4, prevOdd: false, prevFooLength: 3 });

        spy.mockReset();
        Store.set({ foo: 'yo' });
        Store.set({ num: 13 });
        await waitForBatchAndDispatch();

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith({ odd: true, fooLength: 2, prevOdd: false, prevFooLength: 4 });

        spy.mockReset();
        removeListener();

        Store.set({ foo: 'update' });
        await waitForBatchAndDispatch();
        expect(spy).not.toHaveBeenCalled();
    });

    it('uses an invalid mapper producing always non comparable results without throwing an error', async () => {
        const onErrorSpy = jest.spyOn(_config, 'onError').mockImplementation();
        const [useSub, Store] = createStore({ foo: 'bar', bar: 2 });

        let currentReceived: any = null;
        let renderCount = 0;
        let lastEntry: any = [['last', 'entry']];
        const Dummy = () => {
            ++renderCount;
            currentReceived = useSub((store) => ({ entries: Object.entries(store).concat(lastEntry) }));
            return null;
        };
        // when
        const { rerender } = render(<Dummy />);

        // then
        expect(renderCount).toBe(1);
        expect(currentReceived).toEqual({
            entries: [
                ['foo', 'bar'],
                ['bar', 2],
                ['last', 'entry'],
            ],
        });

        // when
        onErrorSpy.mockReset();
        lastEntry = [['updated', 'entry']];
        rerender(<Dummy />);

        // then
        expect(currentReceived).toEqual({
            entries: [
                ['foo', 'bar'],
                ['bar', 2],
                ['updated', 'entry'],
            ],
        });
        expect(onErrorSpy).toHaveBeenCalled();
        expect(onErrorSpy.mock.calls[0]).toEqual([
            'Your mapper does not produce shallow comparable results',
            {
                current: {
                    entries: [
                        ['foo', 'bar'],
                        ['bar', 2],
                        ['updated', 'entry'],
                    ],
                },
                next: {
                    entries: [
                        ['foo', 'bar'],
                        ['bar', 2],
                        ['updated', 'entry'],
                    ],
                },
            },
        ]);
        expect(renderCount).toBe(2);

        // when
        onErrorSpy.mockReset();
        process.env.NODE_ENV = 'production';
        Store.set({ bar: 42 });
        await act(nextTick);

        // then
        expect(onErrorSpy).not.toHaveBeenCalled();
        expect(renderCount).toBe(3);
        expect(currentReceived).toEqual({
            entries: [
                ['foo', 'bar'],
                ['bar', 42],
                ['updated', 'entry'],
            ],
        });
    });
});

describe('_config', () => {
    it('onError', () => {
        // given
        const consoleError = jest.spyOn(console, 'error').mockImplementation();

        // when
        _config.onError('foo', { something: 'else' });

        // then
        expect(consoleError).toHaveBeenCalledWith('foo', { something: 'else' });
    });
});
