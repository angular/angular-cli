import { ng } from '../../utils/process';
import { writeFile, writeMultipleFiles } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';

export default function () {
  // Tests run in 'dev' environment by default.
  return (
    writeMultipleFiles({
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
    })
      .then(() => ng('test', '--watch=false'))
      .then(() =>
        updateJsonFile('angular.json', (configJson) => {
          const appArchitect = configJson.projects['test-project'].architect;
          appArchitect.test.configurations = {
            production: {
              fileReplacements: [
                {
                  src: 'src/environment.ts',
                  replaceWith: 'src/environment.prod.ts',
                },
              ],
            },
          };
        }),
      )

      // Tests can run in different environment.
      .then(() =>
        writeFile(
          'src/app/environment.spec.ts',
          `
      import { environment } from '../environment';

      describe('Test environment', () => {
        it('should have production enabled', () => {
          expect(environment.production).toBe(true);
        });
      });
    `,
        ),
      )
      .then(() => ng('test', '--configuration=production', '--watch=false'))
  );
}
