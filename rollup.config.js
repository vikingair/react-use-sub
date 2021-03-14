import babel from '@rollup/plugin-babel';
import typescript from 'rollup-plugin-typescript2';

export default {
    input: 'index.ts',
    plugins: [
        typescript(),
        babel({
            babelHelpers: 'bundled',
            exclude: 'node_modules/**',
            presets: [['@babel/preset-env', { modules: false, targets: { node: '12' } }]],
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
