import babel from 'rollup-plugin-babel';
import typescript from 'rollup-plugin-typescript2';

export default {
    input: 'index.ts',
    plugins: [
        typescript(),
        babel({
            exclude: 'node_modules/**',
            presets: [['@babel/preset-env', { modules: false, targets: { node: '10' } }]],
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
