import {buildConfig, BuildPackage, packages} from './tools/package-tools';

declare var require: any;

const rimraf = require('rimraf');

const buildPkg = async (pkg: BuildPackage) => {
  pkg.dependencies.forEach(buildPkg);
  await pkg.compileTests();
};


rimraf(buildConfig.outputDir, async () => {
  for (const pkg of packages) {
    console.log(`Building package to test: ${pkg.name}`);
    await buildPkg(pkg);
    console.log(`Finished building: ${pkg.name}`);
  }
});
