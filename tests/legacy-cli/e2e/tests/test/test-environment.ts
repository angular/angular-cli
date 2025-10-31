import { ng } from '../../utils/process';
import { writeFile, writeMultipleFiles } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';
import { getGlobalVariable } from '../../utils/env';

export default async function () {
  const isWebpack = !getGlobalVariable('argv')['esbuild'];

  // Tests run in 'dev' environment by default.
  await writeMultipleFiles({
    'src/environment.prod.ts': `
      export const environment = {
        production: true
      };`,
    'src/environment.ts': `
      export const environment = {
        production: false
      };
      `,
    'src/app/environment.spec.ts': `
      import { environment } from '../environment';

      describe('Test environment', () => {
        it('should have production disabled', () => {
          expect(environment.production).toBe(false);
        });
      });
    `,
  });

  await ng('test', '--watch=false');

  await updateJsonFile('angular.json', (configJson) => {
    const appArchitect = configJson.projects['test-project'].architect;
    appArchitect[isWebpack ? 'test' : 'build'].configurations = {
      production: {
        fileReplacements: [
          {
            replace: 'src/environment.ts',
            with: 'src/environment.prod.ts',
          },
        ],
      },
    };
    if (!isWebpack) {
      appArchitect.test.options ??= {};
      appArchitect.test.options.buildTarget = '::production';
    }
  });

  // Tests can run in different environment.

  await writeFile(
    'src/app/environment.spec.ts',
    `
      import { environment } from '../environment';

      describe('Test environment', () => {
        it('should have production enabled', () => {
          expect(environment.production).toBe(true);
        });
      });
    `,
  );

  if (isWebpack) {
    await ng('test', '--watch=false', '--configuration=production');
  } else {
    await ng('test', '--watch=false');
  }
}
