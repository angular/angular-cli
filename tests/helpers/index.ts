import { ng } from './ng';
import { setup, teardown } from './tmp';

export { ng };

export function setupProject() {
  beforeEach((done) => {
    spyOn(console, 'error');

    setup('./tmp')
      .then(() => process.chdir('./tmp'))
      .then(() => ng(['new', 'foo', '--skip-install']))
      .then(done, done.fail);
  }, 10000);

  afterEach((done) => {
    teardown('./tmp').then(done, done.fail);
  });
}
