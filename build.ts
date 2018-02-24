import {buildConfig, buildLib} from './tools/package-tools';

declare var require: any;

const rimraf = require('rimraf');

rimraf(buildConfig.outputDir, async () => {
  for (const lib of buildConfig.libNames) {
    const exitCode = await buildLib(lib);
    console.log(exitCode === 0 ? `Build succeeded for ${lib}` : `Build failed for ${lib}`);
    console.log();
  }
});
