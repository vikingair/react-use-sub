const { act } = require('@testing-library/react');
const { _config } = require('../dist/cjs');

_config.batch = act;
_config.dispatch = (fn) => fn();
_config.onError = (errMsg) => {
    throw new Error(errMsg);
};
