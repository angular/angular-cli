import * as fs from 'fs-extra';
import * as path from 'path';
import { ng, setupProject } from '../helpers';

const root = process.cwd();

const testPath = path.join(root, 'tmp', 'foo', 'src', 'app');

describe('Acceptance: ng generate class', () => {
  setupProject();

  it('ng generate class my-class', (done) => {
    return ng(['generate', 'class', 'my-class']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'my-class.ts'))).toBe(true);
      expect(fs.pathExistsSync(path.join(testPath, 'my-class.spec.ts'))).toBe(false);
    })
    .then(done, done.fail);
  });

  it('ng generate class my-class --no-spec', (done) => {
    return ng(['generate', 'class', 'my-class', '--no-spec']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'my-class.ts'))).toBe(true);
      expect(fs.pathExistsSync(path.join(testPath, 'my-class.spec.ts'))).toBe(false);
    })
    .then(done, done.fail);
  });

  it('ng generate class my-class.model', (done) => {
    return ng(['generate', 'class', 'my-class.model']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'my-class.model.ts'))).toBe(true);
    })
    .then(done, done.fail);
  });
});
