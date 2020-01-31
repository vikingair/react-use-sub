import { useEffect, useRef, useState } from 'react';
import { unstable_batchedUpdates as batch } from 'react-dom';

type Mapper<DATA, OP> = (state: DATA) => OP;
type Updater<OP> = (state: OP | ((state: OP) => OP)) => void;
type Sub<DATA, OP> = { mapper: Mapper<DATA, OP>; update: Updater<OP>; last: OP };
type InternalDataStore<DATA> = {
    data: DATA;
    subs: Set<Sub<DATA, any>>;
    keys: Array<keyof DATA>;
};
type UseSubType<DATA> = <OP>(mapper: Mapper<DATA, OP>, deps?: ReadonlyArray<unknown>) => OP;
type StoreSetArg<DATA> = Partial<DATA> | ((prev: DATA) => Partial<DATA>);
type StoreSet<DATA> = (update: StoreSetArg<DATA>) => void;
type StoreType<DATA> = { get: () => DATA; set: StoreSet<DATA> };
type CreateStoreReturn<DATA> = [UseSubType<DATA>, StoreType<DATA>];

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
        D.subs.forEach(({ mapper, update, last }) => {
            const nowMapped = mapper(D.data);
            if (_diff(nowMapped, last)) {
                update(nowMapped);
            }
        });
    });

const _update = <DATA extends {}>(D: InternalDataStore<DATA>, next: Partial<DATA>): void => {
    const result = {} as any;
    D.keys.forEach(key => {
        const p = D.data[key];
        const n = next[key];
        result[key] = n !== undefined ? n : p;
    });
    D.data = result;
};

const _center = <DATA extends {}>(D: InternalDataStore<DATA>): StoreType<DATA> => ({
    get: () => D.data,
    set: (update: StoreSetArg<DATA>) => {
        const next: Partial<DATA> = typeof update === 'function' ? update(D.data) : update;
        _update(D, next);
        _enqueue(() => _dispatch(D));
    },
});

const _emptyDeps = [] as ReadonlyArray<undefined>;

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
        const [mapped, update] = useState<OP>(() => mapper(D.data));
        const sub = useRef<Sub<DATA, OP>>({ mapper, update, last: mapped });
        sub.current.last = mapped;

        if (_diffArr(lastDeps.current, deps)) {
            sub.current.mapper = mapper;
            sub.current.last = mapper(D.data);
        }
        lastDeps.current = deps;

        useEffect(() => {
            D.subs.add(sub.current);
            return () => {
                D.subs.delete(sub.current); // eslint-disable-line
            };
        }, []); // eslint-disable-line

        return sub.current.last;
    };

    return [useSub, Store];
};
