import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';

const commonPlugins = [
    commonjs(),
    nodeResolve({
        preferBuiltins: false,
        browser: true
    }),
    json(),
];

const createConfig = (input, additionalPlugins = []) => ({
    input,
    output: {
        file: `dist/${input}`,
        format: 'es'
    },
    plugins: [
        ...commonPlugins,
        ...additionalPlugins
    ]
});

const copyPlugin = copy({
    targets: [
        { src: 'manifest.json', dest: 'dist' },
        { src: 'src/sidepanel/index.html', dest: 'dist/src/sidepanel/' },
        { src: 'src/sidepanel/styles.css', dest: 'dist/src/sidepanel/' },
        { src: 'icons/', dest: 'dist/' }
    ]
});

export default [
    createConfig('src/background/service_worker.js'),
    createConfig('src/scripts/extract_content.js'),
    createConfig('src/scripts/text_splitter.js'),
    createConfig('src/scripts/vector_store.js'),
    createConfig('src/sidepanel/index.js', [copyPlugin]),
];