import { join } from 'node:path';
import { getGlobalVariable } from '../utils/env';
import { expectFileToExist } from '../utils/fs';
import { gitClean } from '../utils/git';
import { setRegistry as setNPMConfigRegistry } from '../utils/packages';
import { ng } from '../utils/process';
import { prepareProjectForE2e, updateJsonFile } from '../utils/project';

export default async function () {
  const argv: Record<string, unknown> = getGlobalVariable('argv');

  if (argv.noproject) {
    return;
  }

  if (argv.reuse && typeof argv.reuse === 'string') {
    process.chdir(argv.reuse);
    await gitClean();
  } else {
    // Ensure local test registry is used when outside a project
    await setNPMConfigRegistry(true);

    await ng('new', 'test-project', '--skip-install');
    await expectFileToExist(join(process.cwd(), 'test-project'));
    process.chdir('./test-project');

    // Setup esbuild builder if requested on the commandline
    const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
    if (useWebpackBuilder) {
      await updateJsonFile('angular.json', (json) => {
        const build = json['projects']['test-project']['architect']['build'];
        build.builder = '@angular-devkit/build-angular:browser';
        build.options = {
          ...build.options,
          main: build.options.browser,
          browser: undefined,
          outputPath: 'dist/test-project/browser',
          index: 'src/index.html',
        };

        build.configurations.development = {
          ...build.configurations.development,
          vendorChunk: true,
          namedChunks: true,
          buildOptimizer: false,
        };

        const serve = json['projects']['test-project']['architect']['serve'];
        serve.builder = '@angular-devkit/build-angular:dev-server';

        const extract = json['projects']['test-project']['architect']['extract-i18n'];
        if (extract) {
          extract.builder = '@angular-devkit/build-angular:extract-i18n';
        }

        const test = json['projects']['test-project']['architect']['test'];
        test.builder = '@angular-devkit/build-angular:karma';
      });
      await updateJsonFile('tsconfig.json', (tsconfig) => {
        delete tsconfig.compilerOptions.esModuleInterop;
        tsconfig.compilerOptions.allowSyntheticDefaultImports = true;
      });
    }

    // Always need `@angular-devkit/build-angular` due to the use of protractor
    await updateJsonFile('package.json', (packageJson) => {
      packageJson.devDependencies['@angular-devkit/build-angular'] =
        packageJson.devDependencies['@angular/build'];
    });
  }

  await prepareProjectForE2e('test-project');
  await ng('version');
}
