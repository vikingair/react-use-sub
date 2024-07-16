import { act } from '@testing-library/react';
import { _config } from '../dist/index.mjs';

_config.batch = act;
_config.dispatch = (fn) => fn();
_config.onError = (errMsg) => {
    throw new Error(errMsg);
};
