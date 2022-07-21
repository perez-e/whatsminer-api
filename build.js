import { build } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import dts from 'npm-dts';

const { Generator } = dts;

new Generator({
  entry: 'src/index.ts',
  output: 'dist/index.d.ts',
}).generate();

const config = {
  entryPoints: ['./src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node16',
  plugins: [nodeExternalsPlugin()],
};

build({
  ...config,
  outfile: 'dist/index.esm.js',
  format: 'esm',
}).catch(() => process.exit(1));

build({
  ...config,
  outfile: 'dist/index.cjs',
  format: 'cjs',
}).catch(() => process.exit(1));
