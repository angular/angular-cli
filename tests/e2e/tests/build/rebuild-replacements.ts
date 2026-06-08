import { getGlobalVariable } from '../../utils/env';
import { appendToFile, createDir, writeMultipleFiles } from '../../utils/fs';
import { waitForAnyProcessOutputToMatch } from '../../utils/process';
import { ngServe, updateJsonFile } from '../../utils/project';

const webpackGoodRegEx = getGlobalVariable('argv')['esbuild']
  ? /Application bundle generation complete\./
  : / Compiled successfully./;

export default async function () {
  if (process.platform.startsWith('win')) {
    return;
  }

  await createDir('src/environments');

  await writeMultipleFiles({
    'src/environments/environment.ts': `export const env = 'dev';`,
    'src/environments/environment.prod.ts': `export const env = 'prod';`,
    'src/main.ts': `
        import { env } from './environments/environment';
        console.log(env);
      `,
  });

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.configurations.production.fileReplacements = [
      {
        replace: 'src/environments/environment.ts',
        with: 'src/environments/environment.prod.ts',
      },
    ];
  });

  await ngServe('--configuration=production');

  // Should trigger a rebuild.
  await appendToFile('src/environments/environment.prod.ts', `console.log('PROD');`);
  await waitForAnyProcessOutputToMatch(webpackGoodRegEx);
}
