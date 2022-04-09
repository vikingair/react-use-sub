import { useRef, useSyncExternalStore } from 'react';

let timeout = undefined as any;
export const _config = {
    // used to run possibly heavy computations of listeners without blocking other listeners from being called
    dispatch: (fn: () => void) => setTimeout(fn, 0),
    // to support calling the store setters multiple times in a single sync process
    batch: (fn: () => void) => {
        clearTimeout(timeout);
        timeout = setTimeout(fn, 0);
    },
};

type Mapper<DATA, OP> = (state: DATA) => OP;
type InternalDataStore<DATA> = {
    data: DATA;
    subs: Set<() => void>;
};
export type UseSubType<DATA> = <OP>(mapper: Mapper<DATA, OP>) => OP;
export type StoreSetArg<DATA, K extends keyof DATA> =
    | Pick<DATA, K>
    | undefined
    | ((prev: DATA) => Pick<DATA, K> | undefined);
export type StoreSet<DATA> = <K extends keyof DATA>(update: StoreSetArg<DATA, K>) => void;
export type StoreRemoveListener = () => void;
export type StoreListen<DATA> = <OP>(
    mapper: Mapper<DATA, OP>,
    listener: (next: OP, prev: OP) => any
) => StoreRemoveListener;
export type StoreType<DATA> = { get: () => DATA; set: StoreSet<DATA>; listen: StoreListen<DATA> };
export type CreateStoreReturn<DATA> = [UseSubType<DATA>, StoreType<DATA>];

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

const _update = <DATA extends {}, K extends keyof DATA>(D: InternalDataStore<DATA>, next: Pick<DATA, K>): void => {
    const result = { ...D.data };
    Object.keys(next).forEach((key) => {
        result[key as keyof typeof next] = next[key as keyof typeof next];
    });
    D.data = result;
};

const _center = <DATA extends {}>(D: InternalDataStore<DATA>): StoreType<DATA> => ({
    get: () => D.data,
    set: <K extends keyof DATA>(update: StoreSetArg<DATA, K>) => {
        const next: Pick<DATA, K> | undefined = typeof update === 'function' ? update(D.data) : update;
        if (next) {
            _update(D, next);
            _config.batch(() => {
                D.subs.forEach((listener: any) => listener());
            });
        }
    },
    listen: <OP extends any>(mapper: Mapper<DATA, OP>, listener: (next: OP, prev: OP) => any): StoreRemoveListener => {
        let last = mapper(D.data);
        const l = () => {
            const next = mapper(D.data);
            const prev = last;
            if (_diff(next, prev)) {
                // we have to enqueue the calling of the listener because otherwise expensive listeners could slow down
                // the notification of all other listeners
                _config.dispatch(() => listener(next, prev));
                last = next;
            }
        };
        D.subs.add(l);
        return () => {
            D.subs.delete(l);
        };
    },
});

export const createStore = <DATA extends {}>(data: DATA): CreateStoreReturn<DATA> => {
    const D = {
        data,
        subs: new Set<() => void>(),
        subscribe: (listener: () => void) => {
            D.subs.add(listener);
            return () => D.subs.delete(listener);
        },
    };
    const Store = _center(D);
    const useSub = <OP,>(mapper: Mapper<DATA, OP>): OP => {
        const resultRef = useRef(mapper(D.data));
        return useSyncExternalStore(D.subscribe, () => {
            const next = mapper(D.data);
            if (_diff(next, resultRef.current)) {
                resultRef.current = next;
            }
            return resultRef.current;
        });
    };

    return [useSub, Store];
};
