const ng: ((parameters: string[]) => Promise<any>) = require('./ng');
const tmp = require('./tmp');

export function setupProject() {
  beforeEach((done) => {
    spyOn(console, 'error');

    tmp.setup('./tmp')
      .then(() => process.chdir('./tmp'))
      .then(() => ng(['new', 'foo', '--skip-install']))
      .then(done, done.fail);
  }, 10000);

  afterEach((done) => {
    tmp.teardown('./tmp').then(done, done.fail);
  });
}

export {
  ng
};
