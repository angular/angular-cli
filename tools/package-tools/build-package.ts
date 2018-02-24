import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'fs';
import {join, dirname} from 'path';

import {buildConfig} from './build-config';
import {rollupGlobals} from './rollup-globals';

const glob = require('glob');
const camelCase = require('camelcase');
const ngc = require('@angular/compiler-cli/src/main').main;
const rollup = require('rollup');
const uglify = require('rollup-plugin-uglify');
const sourcemaps = require('rollup-plugin-sourcemaps');
const nodeResolve = require('rollup-plugin-node-resolve');

const packagesFolder = join(buildConfig.outputDir, 'packages');
const releasesFolder = join(buildConfig.outputDir, 'releases');

export async function buildLib(libName: string, test: boolean = false) {
  const srcFolder = join(buildConfig.projectDir, 'modules', libName);
  const libPackageFolder = join(packagesFolder, libName);
  const libReleaseFolder = join(releasesFolder, libName);
  const libBundlesFolder = join(libReleaseFolder, 'bundles');
  const es5DistFolder = join(libReleaseFolder, 'esm5');
  const es2015DistFolder = join(libReleaseFolder, 'esm2015');
  const es5OutputFolder = join(libPackageFolder, 'lib-es5');
  const es2015OutputFolder = libPackageFolder;
  const tsConfig = test ? 'tsconfig.spec.json' : 'tsconfig.lib.json';

  console.log(`#### BUILDING ${libName} ${test ? 'W/ TESTS ' : ''}####`);

  // Compile to ES2015.
  let exitCode = ngc(['-p', join(srcFolder, tsConfig)]);
  if (exitCode !== 0) {
    return exitCode;
  }

  console.log('ES2015 compilation succeeded.');

  if (test) {
    return 0;
  }

  // Compile to ES5.
  exitCode = ngc([
    '-p',
    join(srcFolder, 'tsconfig.lib.json'),
    '--outDir',
    es5OutputFolder,
    '--target',
    'ES5'
  ]);
  if (exitCode !== 0) {
    return exitCode;
  }

  console.log('ES5 compilation succeeded.');

  // Copy typings and metadata to `dist/` folder.
  await _relativeCopy('**/*.+(d.ts|metadata.json)', es2015OutputFolder,
    join(libReleaseFolder, 'typings'));

  _metaDataReExport(libReleaseFolder, `./typings/index`, libName, libName);
  _typingsReExport(libReleaseFolder, `./typings/index`, libName);

  console.log('Typings and metadata copy succeeded.');

  // Bundle lib.
  const es5Entry = join(es5OutputFolder, `index.js`);
  const es2015Entry = join(es2015OutputFolder, `index.js`);

  // Base configuration.
  const rollupBaseConfig = {
    moduleName: 'nguniversal.' + camelCase(libName),
    sourceMap: true,
    // ATTENTION:
    // Add any dependency or peer dependency your library to `globals` and `external`.
    // This is required for UMD bundle users.
    globals: rollupGlobals,
    external: Object.keys(rollupGlobals),
    plugins: [
      sourcemaps(),
      nodeResolve()
    ]
  };

  // UMD bundle.
  const umdConfig = Object.assign({}, rollupBaseConfig, {
    entry: es5Entry,
    dest: join(libBundlesFolder, `${libName}.umd.js`),
    format: 'umd',
  });

  // Minified UMD bundle.
  const minifiedUmdConfig = Object.assign({}, rollupBaseConfig, {
    entry: es5Entry,
    dest: join(libBundlesFolder, `${libName}.umd.min.js`),
    format: 'umd',
    plugins: rollupBaseConfig.plugins.concat([uglify({})])
  });

  // ESM+ES5 flat module bundle.
  const fesm5config = Object.assign({}, rollupBaseConfig, {
    entry: es5Entry,
    dest: join(es5DistFolder, `${libName}.es5.js`),
    format: 'es'
  });

  // ESM+ES2015 flat module bundle.
  const fesm2015config = Object.assign({}, rollupBaseConfig, {
    entry: es2015Entry,
    dest: join(es2015DistFolder, `${libName}.js`),
    format: 'es'
  });

  const allBundles = [
    umdConfig,
    minifiedUmdConfig,
    fesm5config,
    fesm2015config
  ].map(cfg => rollup.rollup(cfg).then(bundle => bundle.write(cfg)));

  await Promise.all(allBundles)
    .then(() => console.log('All bundles generated successfully.'));

  // Copy package files
  await _relativeCopy('LICENSE', buildConfig.projectDir, libReleaseFolder);
  await _relativeCopy('package.json', srcFolder, libReleaseFolder);
  await _relativeCopy('README.md', srcFolder, libReleaseFolder);

  console.log('Package files copy succeeded.');

  return 0;
}

// Copy files maintaining relative paths.
function _relativeCopy(fileGlob: string, from: string, to: string) {
  return new Promise((resolve, reject) => {
    glob(fileGlob, { cwd: from, nodir: true }, (err: string, files: string[]) => {
      if (err) {
        reject(err);
      }
      files.forEach((file: string) => {
        const origin = join(from, file);
        const dest = join(to, file);
        const data = readFileSync(origin, 'utf-8');
        _recursiveMkDir(dirname(dest));
        writeFileSync(dest, data);
      });
      resolve();
    });
  });
}

// Recursively create a dir.
function _recursiveMkDir(dir: string) {
  if (!existsSync(dir)) {
    _recursiveMkDir(dirname(dir));
    mkdirSync(dir);
  }
}

function _typingsReExport(outDir: string, from: string, fileName: string) {
  writeFileSync(join(outDir, `${fileName}.d.ts`),
    `export * from '${from}';\n`,
    'utf-8');
}

function _metaDataReExport(destDir: string,
                           from: string|string[],
                           entryPointName: string,
                           importAsName: string) {
  from = Array.isArray(from) ? from : [from];

  const metadataJsonContent = JSON.stringify({
    __symbolic: 'module',
    version: 3,
    metadata: {},
    exports: from.map(f => ({from: f})),
    flatModuleIndexRedirect: true,
    importAs: `${buildConfig.namespace}/${importAsName}`
  }, null, 2);

  writeFileSync(join(destDir, `${entryPointName}.metadata.json`), metadataJsonContent, 'utf-8');
}
