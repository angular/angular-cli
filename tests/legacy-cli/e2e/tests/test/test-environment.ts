import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';

export default function () {
  // Tests run in 'dev' environment by default.
  return writeFile('src/app/environment.spec.ts', `
      import { environment } from '../environments/environment';

      describe('Test environment', () => {
        it('should have production disabled', () => {
          expect(environment.production).toBe(false);
        });
      });
    `)
    .then(() => ng('test', '--watch=false'))
    .then(() => updateJsonFile('angular.json', configJson => {
      const appArchitect = configJson.projects['test-project'].architect;
      appArchitect.test.configurations = {
        production: {
          fileReplacements: [
            {
              src: 'src/environments/environment.ts',
              replaceWith: 'src/environments/environment.prod.ts',
            }
          ],
        }
      };
    }))

    // Tests can run in different environment.
    .then(() => writeFile('src/app/environment.spec.ts', `
      import { environment } from '../environments/environment';

      describe('Test environment', () => {
        it('should have production enabled', () => {
          expect(environment.production).toBe(true);
        });
      });
    `))
    .then(() => ng('test', '--prod', '--watch=false'));
}
