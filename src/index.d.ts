type NonArrayObject = {[key: string]: any; [key: number]: never};
type Mapper<DATA, OP = NonArrayObject> = (state: DATA) => OP;
type UseSubType<DATA> = <OP extends NonArrayObject>(mapper: Mapper<DATA, OP>) => OP;
type StoreSetArg<DATA, PD> = PD | ((prev: DATA) => PD);
type StoreSet<DATA> = (update: StoreSetArg<DATA, Partial<DATA>>) => void;
type StoreType<DATA> = { get: () => DATA; set: StoreSet<DATA> };
type CreateStoreReturn<DATA> = [UseSubType<DATA>, StoreType<DATA>];
type CreateStoreType = <DATA>(data: DATA) => CreateStoreReturn<DATA>;

export const createStore: CreateStoreType;
