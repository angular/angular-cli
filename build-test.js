'use strict';

const path = require('path');
const ngc = require('@angular/compiler-cli/src/main').main;
const rimraf = require('rimraf');

const rootFolder = path.join(__dirname);
const distFolder = path.join(rootFolder, 'dist');

const libNames = [
  'aspnetcore-engine',
  'common',
  'express-engine',
  'hapi-engine',
  'module-map-ngfactory-loader',
];

async function buildLib(libName) {

  const srcFolder = path.join(rootFolder, 'modules', libName);

  console.log(`#### BUILDING ${libName} W/ TESTS ####`);

  // Compile to ES2015.
  console.log(path.join(srcFolder, 'tsconfig.spec.json'));
  let exitCode = ngc(['-p', path.join(srcFolder, 'tsconfig.spec.json')]);
  if (exitCode !== 0) {
    return exitCode;
  }

  console.log('ES2015 compilation succeeded.');

  return 0;
}

rimraf(distFolder, async () => {
  for (const lib of libNames) {
    const exitCode = await buildLib(lib);
    console.log(exitCode === 0 ? `Build succeeded for ${lib}` : `Build failed for ${lib}`);
  }
});
