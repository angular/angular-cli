// tslint:disable:max-line-length
import * as fs from 'fs-extra';
import * as path from 'path';
import { ng, setupProject } from '../helpers';

const root = process.cwd();

const testPath = path.join(root, 'tmp', 'foo', 'src', 'app');

describe('Acceptance: ng generate module', () => {
  setupProject();

  it('will fail if no name is specified', (done) => {
    return ng(['generate', 'module']).catch((error: string) => {
      expect(error).toBe('The `ng generate module` command requires a name to be specified.');
    })
    .then(done, done.fail);
  });

  it('ng generate module my-module', (done) => {
    return ng(['generate', 'module', 'my-module']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module.module.ts'))).toBe(true);
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module.module.spec.ts'))).toBe(false);
    })
    .then(done, done.fail);
  });

  it('ng generate module  generate routing file when passed flag --routing', (done) => {
    return ng(['generate', 'module', 'my-module', '--routing']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module.module.ts'))).toBe(true);
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module-routing.module.ts'))).toBe(true);
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module.module.spec.ts'))).toBe(false);
    })
    .then(done, done.fail);
  });

  it('ng generate module my-module --spec', (done) => {
    return ng(['generate', 'module', 'my-module', '--spec']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module.module.ts'))).toBe(true);
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module.module.spec.ts'))).toBe(true);
    })
    .then(done, done.fail);
  });

  it('ng generate module TwoWord', (done) => {
    return ng(['generate', 'module', 'TwoWord']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'two-word', 'two-word.module.ts'))).toBe(true);
      expect(fs.pathExistsSync(path.join(testPath, 'two-word', 'two-word.module.spec.ts'))).toBe(false);
    })
    .then(done, done.fail);
  });

  it('ng generate module parent/child', (done) => {
    return ng(['generate', 'module', 'parent'])
      .then(() => ng(['generate', 'module', 'parent/child']))
      .then(() => {
        expect(fs.pathExistsSync(path.join(testPath, 'parent/child', 'child.module.ts'))).toBe(true);
        expect(fs.pathExistsSync(path.join(testPath, 'parent/child', 'child.module.spec.ts'))).toBe(false);
      })
      .then(done, done.fail);
  });

  it('ng generate module child should work in sub-dir', (done) => {
    fs.mkdirSync(path.join(testPath, './sub-dir'));
    return new Promise(resolve => {
      process.chdir(path.join(testPath, './sub-dir'));
      return resolve();
    })
    .then(() => ng(['generate', 'module', 'child']))
    .then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'sub-dir/child', 'child.module.ts'))).toBe(true);
      expect(fs.pathExistsSync(path.join(testPath, 'sub-dir/child', 'child.module.spec.ts'))).toBe(false);
    })
    .then(done, done.fail);
  });

  // tslint:disable-next-line:max-line-length
  it('ng generate module child should work in sub-dir with routing file when passed --routing flag', (done) => {
    fs.mkdirSync(path.join(testPath, './sub-dir'));
    return new Promise(resolve => {
      process.chdir(path.join(testPath, './sub-dir'));
      return resolve();
    })
    .then(() => ng(['generate', 'module', 'child', '--routing']))
    .then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'sub-dir/child', 'child.module.ts'))).toBe(true);
      expect(fs.pathExistsSync(path.join(testPath, 'sub-dir/child', 'child-routing.module.ts'))).toBe(true);
      expect(fs.pathExistsSync(path.join(testPath, 'sub-dir/child', 'child.module.spec.ts'))).toBe(false);
    })
    .then(done, done.fail);
  });

  // tslint:disable-next-line:max-line-length
  it('ng generate module should generate parent/child module with routing file when passed --routing flag', (done) => {
    return ng(['generate', 'module', 'parent'])
      .then(() => ng(['generate', 'module', 'parent/child', '--routing']))
      .then(() => {
        expect(fs.pathExistsSync(path.join(testPath, 'parent/child', 'child.module.ts'))).toBe(true);
        expect(fs.pathExistsSync(path.join(testPath, 'parent/child', 'child-routing.module.ts'))).toBe(true);
        expect(fs.pathExistsSync(path.join(testPath, 'parent/child', 'child.module.spec.ts'))).toBe(false);
      })
      .then(done, done.fail);
  });
});
