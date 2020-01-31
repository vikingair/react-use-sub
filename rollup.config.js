import babel from 'rollup-plugin-babel';
import typescript from 'rollup-plugin-typescript2';

export default {
    input: 'src/index.tsx',
    plugins: [
        babel({
            exclude: 'node_modules/**',
            presets: [['@babel/preset-env', { modules: false, targets: { node: '8' } }]],
        }),
        typescript(),
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
