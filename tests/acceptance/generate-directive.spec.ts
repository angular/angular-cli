// tslint:disable:max-line-length
import * as fs from 'fs-extra';
import * as path from 'path';
import { ng, setupProject } from '../helpers';

const root = process.cwd();

describe('Acceptance: ng generate directive', () => {
  setupProject();

  it('flat', (done) => {
    return ng(['generate', 'directive', 'flat'])
      .then(() => {
        const testPath = path.join(root, 'tmp/foo/src/app/flat.directive.ts');
        expect(fs.pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it('my-dir --flat false', (done) => {
    const appRoot = path.join(root, 'tmp/foo');
    const testPath = path.join(appRoot, 'src/app/my-dir/my-dir.directive.ts');
    const testSpecPath = path.join(appRoot, 'src/app/my-dir/my-dir.directive.spec.ts');
    const appModulePath = path.join(appRoot, 'src/app/app.module.ts');

    return ng(['generate', 'directive', 'my-dir', '--flat', 'false'])
      .then(() => {
        expect(fs.pathExistsSync(testPath)).toBe(true);
        expect(fs.pathExistsSync(testSpecPath)).toBe(true);
      })
      .then(() => fs.readFile(appModulePath, 'utf-8'))
      .then(content => {
        expect(content).toMatch(/import.*\bMyDirDirective\b.*from '.\/my-dir\/my-dir.directive';/);
        expect(content).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+MyDirDirective\r?\n/m);
      })
      .then(done, done.fail);
  });

  it('my-dir --flat false --no-spec', (done) => {
    const appRoot = path.join(root, 'tmp/foo');
    const testPath = path.join(appRoot, 'src/app/my-dir/my-dir.directive.ts');
    const testSpecPath = path.join(appRoot, 'src/app/my-dir/my-dir.directive.spec.ts');

    return ng(['generate', 'directive', 'my-dir', '--flat', 'false', '--no-spec'])
      .then(() => {
        expect(fs.pathExistsSync(testPath)).toBe(true);
        expect(fs.pathExistsSync(testSpecPath)).toBe(false);
      })
      .then(done, done.fail);
  });

  it('test' + path.sep + 'my-dir', (done) => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', 'test'));
    return ng(['generate', 'directive', 'test' + path.sep + 'my-dir', '--flat', 'false'])
      .then(() => {
        const testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'test', 'my-dir', 'my-dir.directive.ts');
        expect(fs.pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it('test' + path.sep + '..' + path.sep + 'my-dir', (done) => {
    return ng(['generate', 'directive', 'test' + path.sep + '..' + path.sep + 'my-dir', '--flat', 'false'])
      .then(() => {
        const testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'my-dir', 'my-dir.directive.ts');
        expect(fs.pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it('my-dir from a child dir', (done) => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        process.env.CWD = process.cwd();
        return ng(['generate', 'directive', 'my-dir', '--flat', 'false']);
      })
      .then(() => {
        const testPath =
          path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'my-dir', 'my-dir.directive.ts');
        expect(fs.pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it('child-dir' + path.sep + 'my-dir from a child dir', (done) => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        process.env.CWD = process.cwd();
        return ng(['generate', 'directive', 'child-dir' + path.sep + 'my-dir', '--flat', 'false']);
      })
      .then(() => {
        const testPath = path.join(
          root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir', 'my-dir', 'my-dir.directive.ts');
        expect(fs.pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it('child-dir' + path.sep + '..' + path.sep + 'my-dir from a child dir',
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
          return ng(['generate', 'directive', 'child-dir' + path.sep + '..' + path.sep + 'my-dir', '--flat', 'false']);
        })
        .then(() => {
          const testPath =
            path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'my-dir', 'my-dir.directive.ts');
          expect(fs.pathExistsSync(testPath)).toBe(true);
        })
        .then(done, done.fail);
    });

  it(path.sep + 'my-dir from a child dir, gens under ' +
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
          return ng(['generate', 'directive', path.sep + 'my-dir', '--flat', 'false']);
        })
        .then(() => {
          const testPath =
            path.join(root, 'tmp', 'foo', 'src', 'app', 'my-dir', 'my-dir.directive.ts');
          expect(fs.pathExistsSync(testPath)).toBe(true);
        })
        .then(done, done.fail);
    });

  it('..' + path.sep + 'my-dir from root dir will fail', (done) => {
    return ng(['generate', 'directive', '..' + path.sep + 'my-dir'])
      .then(() => done.fail())
      .catch((err) => {
        expect(err).toBe(`Invalid path: "..${path.sep}my-dir" cannot be above the "src${path.sep}app" directory`);
      })
      .then(done, done.fail);
  });

  it('converts dash-cased-name to a camelCasedSelector', (done) => {
    const appRoot = path.join(root, 'tmp/foo');
    const directivePath = path.join(appRoot, 'src/app/my-dir.directive.ts');
    return ng(['generate', 'directive', 'my-dir'])
      .then(() => fs.readFile(directivePath, 'utf-8'))
      .then(content => {
        // expect(content).toMatch(/selector: [app-my-dir]/m);
        expect(content).toMatch(/selector: '\[appMyDir\]'/);
      })
      .then(done, done.fail);
  });

  it('should error out when given an incorrect module path', (done) => {
    return Promise.resolve()
      .then(() => ng(['generate', 'directive', 'baz', '--module', 'foo']))
      .then(() => done.fail())
      .catch((error) => {
        expect(error).toBe('Specified module does not exist');
      })
      .then(done, done.fail);
  });

  describe('should import and add to declaration list', () => {
    it('when given a root level module with module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/app.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'directive', 'baz', '--module', 'app.module.ts']))
        .then(() => fs.readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazDirective.*from '.\/baz.directive';/);
          expect(content).toMatch(/declarations:\s+\[\r?\n\s+AppComponent,\r?\n\s+BazDirective\r?\n\s+\]/m);
        })
        .then(done, done.fail);
    });

    it('when given a root level module with missing module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/app.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'directive', 'baz', '--module', 'app']))
        .then(() => fs.readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazDirective.*from '.\/baz.directive';/);
          expect(content).toMatch(/declarations:\s+\[\r?\n\s+AppComponent,\r?\n\s+BazDirective\r?\n\s+\]/m);
        })
        .then(done, done.fail);
    });

    it('when given a submodule with module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/foo/foo.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'module', 'foo']))
        .then(() => ng(['generate', 'directive', 'baz', '--module', path.join('foo', 'foo.module.ts')]))
        .then(() => fs.readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazDirective.*from '..\/baz.directive';/);
          expect(content).toMatch(/declarations:\s+\[BazDirective]/m);
        })
        .then(done, done.fail);
    });

    it('when given a submodule with missing module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/foo/foo.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'module', 'foo']))
        .then(() => ng(['generate', 'directive', 'baz', '--module', path.join('foo', 'foo')]))
        .then(() => fs.readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazDirective.*from '..\/baz.directive';/);
          expect(content).toMatch(/declarations:\s+\[BazDirective]/m);
        })
        .then(done, done.fail);
    });

    it('when given a submodule folder', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/foo/foo.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'module', 'foo']))
        .then(() => ng(['generate', 'directive', 'baz', '--module', 'foo']))
        .then(() => fs.readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazDirective.*from '..\/baz.directive';/);
          expect(content).toMatch(/declarations:\s+\[BazDirective]/m);
        })
        .then(done, done.fail);
    });

    it('when given deep submodule folder with missing module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/foo/bar/bar.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'module', 'foo']))
        .then(() => ng(['generate', 'module', path.join('foo', 'bar')]))
        .then(() => ng(['generate', 'directive', 'baz', '--module', path.join('foo', 'bar')]))
        .then(() => fs.readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazDirective.*from '..\/..\/baz.directive';/);
          expect(content).toMatch(/declarations:\s+\[BazDirective]/m);
        })
        .then(done, done.fail);
    });
  });
});
