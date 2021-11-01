import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';

const extensions = ['.ts', '.tsx'];

export default {
    input: 'index.ts',
    plugins: [
        resolve({ extensions }),
        babel({
            extensions,
            babelHelpers: 'bundled',
            exclude: 'node_modules/**',
        }),
    ],
    external: ['react', 'react-dom'],
    output: [
        {
            dir: 'dist/cjs',
            format: 'cjs',
        },
        {
            dir: 'dist/esm',
            format: 'esm',
        },
    ],
};
