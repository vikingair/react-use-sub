import React from 'react';
import { render } from '@testing-library/react';
import { createStore, _config } from '../src';
import { act } from 'react-dom/test-utils';

_config.batch = act as any;
_config.enqueue = (fn): any => fn();

describe('test-util', () => {
    it('allows to update the react state without the need of jest.runAllTimers', () => {
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

        expect(renderCount).toBe(3);
        expect(currentReceived).toBe(true);

        // does re-render twice instead of not-updating when test-util is activated
        Store.set({ foo: true });
        Store.set({ foo: false });

        expect(renderCount).toBe(5);
        expect(currentReceived).toBe(true);
    });
});
