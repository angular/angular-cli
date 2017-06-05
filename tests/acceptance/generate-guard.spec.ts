import * as fs from 'fs-extra';
import * as path from 'path';
import { ng, setupProject } from '../helpers';

const root = process.cwd();

describe('Acceptance: ng generate guard', function () {
  setupProject();

  it('ng generate guard my-guard', (done) => {
    const appRoot = path.join(root, 'tmp/foo');
    const testPath = path.join(appRoot, 'src/app/my-guard.guard.ts');
    const testSpecPath = path.join(appRoot, 'src/app/my-guard.guard.spec.ts');
    const appModulePath = path.join(appRoot, 'src/app/app.module.ts');

    return ng(['generate', 'guard', 'my-guard'])
      .then(() => {
        expect(fs.pathExistsSync(testPath)).toBe(true);
        expect(fs.pathExistsSync(testSpecPath)).toBe(true);
      })
      .then(() => fs.readFile(appModulePath, 'utf-8'))
      .then((content: string) => {
        expect(content).not.toMatch(/import.*MyGuardGuard.*from '.\/my-guard.guard';/);
        expect(content).not.toMatch(/providers:\s*\[MyGuardGuard\]/m);
      })
      .then(done, done.fail);
  });

  it('ng generate guard my-guard --no-spec', (done) => {
    const appRoot = path.join(root, 'tmp/foo');
    const testPath = path.join(appRoot, 'src/app/my-guard.guard.ts');
    const testSpecPath = path.join(appRoot, 'src/app/my-guard.guard.spec.ts');
    const appModulePath = path.join(appRoot, 'src/app/app.module.ts');

    return ng(['generate', 'guard', 'my-guard', '--no-spec'])
      .then(() => {
        expect(fs.pathExistsSync(testPath)).toBe(true);
        expect(fs.pathExistsSync(testSpecPath)).toBe(false);
      })
      .then(() => fs.readFile(appModulePath, 'utf-8'))
      .then((content: string) => {
        expect(content).not.toMatch(/import.*MyGuardGuard.*from '.\/my-guard.guard';/);
        expect(content).not.toMatch(/providers:\s*\[MyGuardGuard\]/m);
      })
      .then(done, done.fail);
  });

  it('ng generate guard test' + path.sep + 'my-guard', (done) => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', 'test'));
    return ng(['generate', 'guard', 'test' + path.sep + 'my-guard']).then(() => {
      const testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'test', 'my-guard.guard.ts');
      expect(fs.pathExistsSync(testPath)).toBe(true);
    })
    .then(done, done.fail);
  });

  it('ng generate guard test' + path.sep + '..' + path.sep + 'my-guard', (done) => {
    return ng(['generate', 'guard', 'test' + path.sep + '..' + path.sep + 'my-guard']).then(() => {
      const testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'my-guard.guard.ts');
      expect(fs.pathExistsSync(testPath)).toBe(true);
    })
    .then(done, done.fail);
  });

  it('ng generate guard my-guard from a child dir', (done) => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        process.env.CWD = process.cwd();
        return ng(['generate', 'guard', 'my-guard']);
      })
      .then(() => {
        const testPath = path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'my-guard.guard.ts');
        expect(fs.pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it('ng generate guard child-dir' + path.sep + 'my-guard from a child dir', (done) => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        process.env.CWD = process.cwd();
        return ng(['generate', 'guard', 'child-dir' + path.sep + 'my-guard']);
      })
      .then(() => {
        const testPath = path.join(
          root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir', 'my-guard.guard.ts');
        expect(fs.pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it('ng generate guard child-dir' + path.sep + '..' + path.sep + 'my-guard from a child dir',
    (done) => {
      fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
      return new Promise(function (resolve) {
        process.chdir('./src');
        resolve();
      })
        .then(() => process.chdir('./app'))
        .then(() => process.chdir('./1'))
        .then(() => {
          process.env.CWD = process.cwd();
          return ng(
            ['generate', 'guard', 'child-dir' + path.sep + '..' + path.sep + 'my-guard']);
        })
        .then(() => {
          const testPath =
            path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'my-guard.guard.ts');
          expect(fs.pathExistsSync(testPath)).toBe(true);
        })
        .then(done, done.fail);
    });

  it('ng generate guard ' + path.sep + 'my-guard from a child dir, gens under ' +
    path.join('src', 'app'),
    (done) => {
      fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
      return new Promise(function (resolve) {
        process.chdir('./src');
        resolve();
      })
        .then(() => process.chdir('./app'))
        .then(() => process.chdir('./1'))
        .then(() => {
          process.env.CWD = process.cwd();
          return ng(['generate', 'guard', path.sep + 'my-guard']);
        })
        .then(() => {
          const testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'my-guard.guard.ts');
          expect(fs.pathExistsSync(testPath)).toBe(true);
        })
        .then(done, done.fail);
    });

  it('ng generate guard ..' + path.sep + 'my-guard from root dir will fail', (done) => {
    return ng(['generate', 'guard', '..' + path.sep + 'my-guard'])
      .then(() => done.fail())
      .catch(err => {
        // tslint:disable-next-line:max-line-length
        expect(err).toBe(`Invalid path: "..${path.sep}my-guard" cannot be above the "src${path.sep}app" directory`);
      })
      .then(done, done.fail);
  });

  it('should error out when given an incorrect module path', (done) => {
    return Promise.resolve()
      .then(() => ng(['generate', 'guard', 'baz', '--module', 'foo']))
      .then(() => done.fail())
      .catch((error) => {
        expect(error).toBe('Specified module does not exist');
      })
      .then(done, done.fail);
  });

  describe('should import and add to provider list', () => {
    it('when given a root level module with module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/app.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'guard', 'baz', '--module', 'app.module.ts']))
        .then(() => fs.readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazGuard.*from '.\/baz.guard';/);
          expect(content).toMatch(/providers:\s*\[BazGuard\]/m);
        })
        .then(done, done.fail);
    });

    it('when given a root level module with missing module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/app.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'guard', 'baz', '--module', 'app']))
        .then(() => fs.readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazGuard.*from '.\/baz.guard';/);
          expect(content).toMatch(/providers:\s*\[BazGuard\]/m);
        })
        .then(done, done.fail);
    });

    it('when given a submodule with module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/foo/foo.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'module', 'foo']))
        .then(() => ng(['generate', 'guard', 'baz', '--module', path.join('foo', 'foo.module.ts')]))
        .then(() => fs.readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazGuard.*from '..\/baz.guard';/);
          expect(content).toMatch(/providers:\s*\[BazGuard\]/m);
        })
        .then(done, done.fail);
    });

    it('when given a submodule with missing module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/foo/foo.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'module', 'foo']))
        .then(() => ng(['generate', 'guard', 'baz', '--module', path.join('foo', 'foo')]))
        .then(() => fs.readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazGuard.*from '..\/baz.guard';/);
          expect(content).toMatch(/providers:\s*\[BazGuard\]/m);
        })
        .then(done, done.fail);
    });

    it('when given a submodule folder', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/foo/foo.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'module', 'foo']))
        .then(() => ng(['generate', 'guard', 'baz', '--module', 'foo']))
        .then(() => fs.readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazGuard.*from '..\/baz.guard';/);
          expect(content).toMatch(/providers:\s*\[BazGuard\]/m);
        })
        .then(done, done.fail);
    });

    it('when given deep submodule folder with missing module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/foo/bar/bar.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'module', 'foo']))
        .then(() => ng(['generate', 'module', path.join('foo', 'bar')]))
        .then(() => ng(['generate', 'guard', 'baz', '--module', path.join('foo', 'bar')]))
        .then(() => fs.readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazGuard.*from '..\/..\/baz.guard';/);
          expect(content).toMatch(/providers:\s*\[BazGuard\]/m);
        })
        .then(done, done.fail);
    });
  });
});
