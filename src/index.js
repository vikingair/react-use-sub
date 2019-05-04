// @flow

import { useEffect, useRef, useState } from 'react';

type Mapper<DATA, OP = { [prop: string]: any }> = (state: DATA) => OP;
type Updater = (boolean | (boolean => boolean)) => void;
type Sub<DATA, OP> = { mapper: Mapper<DATA, OP>, update: Updater, last: OP };
type InternalDataStore<DATA> = {
    data: DATA,
    subs: Set<Sub<DATA, any>>,
    keys: Array<$Keys<DATA>>,
};
type UseSubType<DATA> = <OP>(mapper: Mapper<DATA, OP>) => OP;
type StoreSetArg<DATA> = $Shape<DATA> | ((prev: DATA) => $Shape<DATA>);
type StoreSet<DATA> = (update: StoreSetArg<DATA>) => void;
type StoreType<DATA> = { get: () => DATA, set: StoreSet<DATA> };
type CreateStoreReturn<DATA> = [UseSubType<DATA>, StoreType<DATA>];

const _update = <DATA: {}>(D: InternalDataStore<DATA>, next: $Shape<DATA>): void => {
    D.data = D.keys.reduce(
        (prev, key) => {
            const n = next[key];
            if (n !== undefined) {
                const nN: any = n;
                prev[key] = nN;
            }
            return prev;
        },
        { ...D.data }
    );
};

const _dispatch = <DATA: {}>(D: InternalDataStore<DATA>): void => {
    D.subs.forEach(({ mapper, update, last }) => {
        const nowMapped = mapper(D.data);
        if (Object.keys(nowMapped).some((prop: string) => last[prop] !== nowMapped[prop])) {
            update(b => !b);
        }
    });
};

const _center = <DATA: {}>(D: InternalDataStore<DATA>): StoreType<DATA> => ({
    get: () => D.data,
    set: (update: StoreSetArg<DATA>) => {
        const next: $Shape<DATA> = typeof update === 'function' ? update(D.data) : update;
        _update(D, next);
        _dispatch(D);
    },
});

export const createStore = <DATA: {}>(data: DATA): CreateStoreReturn<DATA> => {
    const keys: any[] = Object.keys(data);
    const D: InternalDataStore<DATA> = {
        data,
        subs: new Set<Sub<DATA, any>>(),
        keys,
    };
    const Store = _center(D);
    const useSub = <OP>(mapper: Mapper<DATA, OP>): OP => {
        const update = useState<boolean>(true)[1];
        const mapped = mapper(D.data);
        const sub = useRef<Sub<DATA, OP>>({ mapper, update, last: mapped });
        sub.current.last = mapped;

        useEffect(() => {
            D.subs.add(sub.current);
            return () => {
                D.subs.delete(sub.current); // eslint-disable-line
            };
        }, []); // eslint-disable-line

        return mapped;
    };

    return [useSub, Store];
};
