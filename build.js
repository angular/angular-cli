'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const camelCase = require('camelcase');
const ngc = require('@angular/compiler-cli/src/main').main;
const rollup = require('rollup');
const uglify = require('rollup-plugin-uglify');
const sourcemaps = require('rollup-plugin-sourcemaps');
const nodeResolve = require('rollup-plugin-node-resolve');
const rimraf = require('rimraf');

const rootFolder = path.join(__dirname);
const distFolder = path.join(rootFolder, 'dist');
const packagesFolder = path.join(distFolder, 'packages');
const releasesFolder = path.join(distFolder, 'releases');

const rollupGlobals = {
  // The key here is library name, and the value is the the name of the global variable name
  // the window object.
  // See rollup/rollup/wiki/JavaScript-API#globals for more.
  '@angular/animations': 'ng.animations',
  '@angular/core': 'ng.core',
  '@angular/common': 'ng.common',
  '@angular/common/http': 'ng.common.http',
  '@angular/http': 'ng.http',
  '@angular/platform-browser': 'ng.platformBrowser',
  '@angular/platform-server': 'ng.platformServer',
  '@angular/platform-browser-dynamic': 'ng.platformBrowserDynamic',
  'rxjs/Observable': 'Rx',
  'rxjs/operators/filter': 'Rx.operators',
  'rxjs/operators/map': 'Rx.operators',
  'rxjs/operators/take': 'Rx.operators',
  'rxjs/operators/tap': 'Rx.operators',
  'rxjs/observable/of': 'Rx.Observable',
  'fs': 'fs'
};

const namespace = '@nguniversal';
const libNames = [
  'aspnetcore-engine',
  'common',
  'express-engine',
  'hapi-engine',
  'module-map-ngfactory-loader',
];

async function buildLib(libName) {

  const srcFolder = path.join(rootFolder, 'modules', libName);
  const libPackageFolder = path.join(packagesFolder, libName);
  const libReleaseFolder = path.join(releasesFolder, libName);
  const libBundlesFolder = path.join(libReleaseFolder, 'bundles');
  const es5DistFolder = path.join(libReleaseFolder, 'esm5');
  const es2015DistFolder = path.join(libReleaseFolder, 'esm2015');
  const es5OutputFolder = path.join(libPackageFolder, 'lib-es5');
  const es2015OutputFolder = libPackageFolder;

  console.log(`#### BUILDING ${libName} ####`);

  // Compile to ES2015.
  let exitCode = ngc(['-p', path.join(srcFolder, 'tsconfig.lib.json')]);
  if (exitCode !== 0) {
    return exitCode;
  }

  console.log('ES2015 compilation succeeded.');

  // Compile to ES5.
  exitCode = ngc(['-p', path.join(srcFolder, 'tsconfig.lib.json'), '--outDir', es5OutputFolder, '--target', 'ES5']);
  if (exitCode !== 0) {
    return exitCode;
  }

  console.log('ES5 compilation succeeded.');

  // Copy typings and metadata to `dist/` folder.
  await _relativeCopy('**/*.+(d.ts|metadata.json)', es2015OutputFolder, path.join(libReleaseFolder, 'typings'));

  _metaDataReExport(libReleaseFolder, `./typings/index`, libName, libName);
  _typingsReExport(libReleaseFolder, `./typings/index`, libName);

  console.log('Typings and metadata copy succeeded.');

  // Bundle lib.
  const es5Entry = path.join(es5OutputFolder, `index.js`);
  const es2015Entry = path.join(es2015OutputFolder, `index.js`);

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
    dest: path.join(libBundlesFolder, `${libName}.umd.js`),
    format: 'umd',
  });

  // Minified UMD bundle.
  const minifiedUmdConfig = Object.assign({}, rollupBaseConfig, {
    entry: es5Entry,
    dest: path.join(libBundlesFolder, `${libName}.umd.min.js`),
    format: 'umd',
    plugins: rollupBaseConfig.plugins.concat([uglify({})])
  });

  // ESM+ES5 flat module bundle.
  const fesm5config = Object.assign({}, rollupBaseConfig, {
    entry: es5Entry,
    dest: path.join(es5DistFolder, `${libName}.es5.js`),
    format: 'es'
  });

  // ESM+ES2015 flat module bundle.
  const fesm2015config = Object.assign({}, rollupBaseConfig, {
    entry: es2015Entry,
    dest: path.join(es2015DistFolder, `${libName}.js`),
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
  await _relativeCopy('LICENSE', rootFolder, libReleaseFolder);
  await _relativeCopy('package.json', srcFolder, libReleaseFolder);
  await _relativeCopy('README.md', srcFolder, libReleaseFolder);

  console.log('Package files copy succeeded.');

  return 0;
}

rimraf(distFolder, async () => {
  for (const lib of libNames) {
    const exitCode = await buildLib(lib);
    console.log(exitCode === 0 ? `Build succeeded for ${lib}` : `Build failed for ${lib}`);
  }
});

// Copy files maintaining relative paths.
function _relativeCopy(fileGlob, from, to) {
  return new Promise((resolve, reject) => {
    glob(fileGlob, { cwd: from, nodir: true }, (err, files) => {
      if (err) reject(err);
      files.forEach(file => {
        const origin = path.join(from, file);
        const dest = path.join(to, file);
        const data = fs.readFileSync(origin, 'utf-8');
        _recursiveMkDir(path.dirname(dest));
        fs.writeFileSync(dest, data);
      });
      resolve();
    })
  });
}

// Recursively create a dir.
function _recursiveMkDir(dir) {
  if (!fs.existsSync(dir)) {
    _recursiveMkDir(path.dirname(dir));
    fs.mkdirSync(dir);
  }
}

function _typingsReExport(outDir, from, fileName) {
  fs.writeFileSync(path.join(outDir, `${fileName}.d.ts`),
    `export * from '${from}';\n`,
    'utf-8');
}

function _metaDataReExport(destDir, from, entryPointName, importAsName) {
  from = Array.isArray(from) ? from : [from];

  const metadataJsonContent = JSON.stringify({
    __symbolic: 'module',
    version: 3,
    metadata: {},
    exports: from.map(f => ({from: f})),
    flatModuleIndexRedirect: true,
    importAs: `${namespace}/${importAsName}`
  }, null, 2);

  fs.writeFileSync(path.join(destDir, `${entryPointName}.metadata.json`), metadataJsonContent, 'utf-8');
}
