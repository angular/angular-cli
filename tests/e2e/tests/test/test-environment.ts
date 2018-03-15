import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';

export default function () {
  // TODO(architect): re-enable after build-webpack supports this functionality.
  return;

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

    // Tests can run in different environment.
    .then(() => writeFile('src/app/environment.spec.ts', `
      import { environment } from '../environments/environment';

      describe('Test environment', () => {
        it('should have production enabled', () => {
          expect(environment.production).toBe(true);
        });
      });
    `))
    .then(() => ng('test', '-e', 'prod', '--watch=false'));
}
