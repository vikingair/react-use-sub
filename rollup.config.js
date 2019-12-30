import babel from 'rollup-plugin-babel';
import flowEntry from 'rollup-plugin-flow-entry';

export default {
    input: 'src/index.js',
    plugins: [
        babel({
            exclude: 'node_modules/**',
            presets: [['@babel/preset-env', { modules: false, targets: { node: '8' } }]],
        }),
        flowEntry(),
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
