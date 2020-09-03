import { useCallback, useEffect, useRef, useState } from 'react';
import { unstable_batchedUpdates as batch } from 'react-dom';

type Mapper<DATA, OP> = (state: DATA) => OP;
type Sub<DATA, OP> = { mapper: Mapper<DATA, OP>; update: () => void; last: OP };
type InternalDataStore<DATA> = {
    data: DATA;
    subs: Set<Sub<DATA, any>>;
    keys: Array<keyof DATA>;
};
export type UseSubType<DATA> = <OP>(mapper: Mapper<DATA, OP>, deps?: ReadonlyArray<unknown>) => OP;
export type StoreSetArg<DATA> = Partial<DATA> | undefined | ((prev: DATA) => Partial<DATA> | undefined);
export type StoreSet<DATA> = (update: StoreSetArg<DATA>) => void;
export type StoreType<DATA> = { get: () => DATA; set: StoreSet<DATA> };
export type CreateStoreReturn<DATA> = [UseSubType<DATA>, StoreType<DATA>];

const _enqueue = (fn: () => void) => window.setTimeout(fn, 0);
const _type = (a: any): string => Object.prototype.toString.call(a);
const _diffArr = (a: ReadonlyArray<unknown>, b: ReadonlyArray<unknown>): boolean =>
    a.length !== b.length || a.some((v, i) => b[i] !== v);
const _diff = (a: any, b: any): boolean => {
    if (a === b) return false;
    const aType = _type(a);
    if (aType !== _type(b)) return true;
    if (aType === '[object Array]') return _diffArr(a, b);
    if (aType === '[object Object]')
        return Object.keys(a)
            .concat(Object.keys(b))
            .some((i: string) => b[i] !== a[i]);
    return true;
};

const _dispatch = <DATA extends {}>(D: InternalDataStore<DATA>): void =>
    batch(() => {
        D.subs.forEach((sub) => {
            const next = sub.mapper(D.data);
            if (_diff(next, sub.last)) {
                sub.last = next;
                sub.update();
            }
        });
    });

const _update = <DATA extends {}>(D: InternalDataStore<DATA>, next: Partial<DATA>): void => {
    const result = {} as any;
    D.keys.forEach((key) => {
        const p = D.data[key];
        const n = next[key];
        result[key] = n !== undefined ? n : p;
    });
    D.data = result;
};

const _center = <DATA extends {}>(D: InternalDataStore<DATA>): StoreType<DATA> => ({
    get: () => D.data,
    set: (update: StoreSetArg<DATA>) => {
        const next: Partial<DATA> | undefined = typeof update === 'function' ? update(D.data) : update;
        if (next) {
            _update(D, next);
            _enqueue(() => _dispatch(D));
        }
    },
});

const _emptyDeps = [] as ReadonlyArray<undefined>;
// helper hook to enforce controlled re-rendering of the component
const _toggle = (b: boolean) => !b;
const useUpdate = () => {
    const setBool = useState(true)[1];
    return useCallback(() => setBool(_toggle), []);
};

export const createStore = <DATA extends {}>(data: DATA): CreateStoreReturn<DATA> => {
    const keys: any[] = Object.keys(data);
    const D: InternalDataStore<DATA> = {
        data,
        subs: new Set<Sub<DATA, any>>(),
        keys,
    };
    const Store = _center(D);
    const useSub = <OP extends any>(mapper: Mapper<DATA, OP>, deps: ReadonlyArray<unknown> = _emptyDeps): OP => {
        const lastDeps = useRef(deps);
        const update = useUpdate();
        const sub = useRef<Sub<DATA, OP>>({ mapper, update, last: mapper(D.data) });

        if (_diffArr(lastDeps.current, deps)) {
            sub.current.mapper = mapper;
            sub.current.last = mapper(D.data);
        }
        lastDeps.current = deps;

        useEffect(() => {
            D.subs.add(sub.current);
            return () => {
                D.subs.delete(sub.current);
            };
        }, []);

        return sub.current.last;
    };

    return [useSub, Store];
};
