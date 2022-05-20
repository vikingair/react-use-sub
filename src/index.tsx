import { useRef, useSyncExternalStore } from 'react';

export const _config = {
    // used to run possibly heavy computations of listeners without blocking other listeners from being called
    dispatch: (fn: () => void) => setTimeout(fn, 0),
    // to support calling the store setters multiple times in a single sync process
    batch: (fn: () => void, timeoutRef: { current: any }) => {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(fn, 0);
    },
    onError: (errMsg: string, ...details: unknown[]): void => {
        // On local development we want to behave similar as in the deployed version, but be notified about bad
        // implementations. Following the good practice of React.StrictMode.
        // eslint-disable-next-line no-console
        console.error(errMsg, ...details);
    },
};

type Mapper<DATA, OP> = (state: DATA) => OP;
type InternalDataStore<DATA> = {
    data: DATA;
    subs: Set<() => void>;
    timeoutRef: { current: any };
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
            }, D.timeoutRef);
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
        timeoutRef: { current: undefined },
    };
    const Store = _center(D);
    const useSub = <OP,>(mapper: Mapper<DATA, OP>): OP => {
        const resultRef = useRef(mapper(D.data));
        const dataRef = useRef(D.data);
        const mapperRef = useRef(mapper);
        return useSyncExternalStore(D.subscribe, () => {
            // to avoid unnecessary mapper calls, we check if something was updated
            // ATTENTION: By adding this logic this hook should not be combined was non-mutating callbacks using
            //            e.g. "useRef" or "useEvent" hooks to generate the mappers. We will throw in these cases when
            //            shipping non production code.
            const prevData = dataRef.current;
            dataRef.current = D.data;
            const prevMapper = mapperRef.current;
            mapperRef.current = mapper;
            if (prevData === D.data && prevMapper === mapper) {
                if (process.env.NODE_ENV !== 'production') {
                    const current = resultRef.current;
                    const next = mapper(D.data);
                    if (_diff(next, current)) {
                        _config.onError('Your mapper does not produce shallow comparable results', { current, next });
                    }
                }
                return resultRef.current;
            }
            const next = mapper(D.data);
            if (_diff(next, resultRef.current)) {
                resultRef.current = next;
            }
            return resultRef.current;
        });
    };

    return [useSub, Store];
};
