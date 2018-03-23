import {buildConfig, BuildPackage, composeRelease, packages} from './tools/package-tools';

declare var require: any;

const rimraf = require('rimraf');

const buildPkg = async (pkg: BuildPackage) => {
  pkg.dependencies.forEach(buildPkg);
  await pkg.compile();
  await pkg.createBundles();
};


rimraf(buildConfig.outputDir, async () => {
  for (const pkg of packages) {
    console.log(`Building package: ${pkg.name}`);
    await buildPkg(pkg);
    composeRelease(pkg);
    console.log(`Finished building: ${pkg.name}`);
  }
});
