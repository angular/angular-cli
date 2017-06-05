// tslint:disable:max-line-length
import { mkdirsSync, pathExistsSync, readFile, readFileSync } from 'fs-extra';
import * as path from 'path';
import { ng, setupProject } from '../helpers';

const root = process.cwd();


describe('Acceptance: ng generate component', () => {
  setupProject();

  it('my-comp', (done) => {
    const testPath = path.join(root, 'tmp/foo/src/app/my-comp/my-comp.component.ts');
    const appModule = path.join(root, 'tmp/foo/src/app/app.module.ts');
    return ng(['generate', 'component', 'my-comp'])
      .then(() => expect(pathExistsSync(testPath)).toBe(true))
      .then(() => readFile(appModule, 'utf-8'))
      .then(content => {
        // Expect that the app.module contains a reference to my-comp and its import.
        expect(content).toMatch(/import.*MyCompComponent.*from '.\/my-comp\/my-comp.component';/);
        expect(content).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+MyCompComponent\r?\n/m);
      })
      .then(done, done.fail);
  });

  it('generating my-comp twice does not add two declarations to module', (done) => {
    const appModule = path.join(root, 'tmp/foo/src/app/app.module.ts');
    return ng(['generate', 'component', 'my-comp'])
      .then(() => ng(['generate', 'component', 'my-comp']))
      .then(() => readFile(appModule, 'utf-8'))
      .then(content => {
        expect(content).toMatch(/declarations:\s+\[\r?\n\s+AppComponent,\r?\n\s+MyCompComponent\r?\n\s+\]/m);
      })
      .then(done, done.fail);
  });

  it('test' + path.sep + 'my-comp', (done) => {
    mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', 'test'));
    return ng(['generate', 'component', 'test' + path.sep + 'my-comp']).then(() => {
      const testPath =
        path.join(root, 'tmp', 'foo', 'src', 'app', 'test', 'my-comp', 'my-comp.component.ts');
      expect(pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it('test' + path.sep + '..' + path.sep + 'my-comp', (done) => {
    return ng(['generate', 'component', 'test' + path.sep + '..' + path.sep + 'my-comp'])
      .then(() => {
        const testPath =
          path.join(root, 'tmp', 'foo', 'src', 'app', 'my-comp', 'my-comp.component.ts');
        expect(pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it('my-comp from a child dir', (done) => {
    mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        return ng(['generate', 'component', 'my-comp']);
      })
      .then(() => {
        const testPath =
          path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'my-comp', 'my-comp.component.ts');
        expect(pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it('child-dir' + path.sep + 'my-comp from a child dir', (done) => {
    mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        return ng(['generate', 'component', 'child-dir' + path.sep + 'my-comp']);
      })
      .then(() => {
        const testPath = path.join(
          root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir', 'my-comp', 'my-comp.component.ts');
        expect(pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it('child-dir' + path.sep + '..' + path.sep + 'my-comp from a child dir', (done) => {
    mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
    return Promise.resolve()
      .then(() => process.chdir(path.normalize('./src/app/1')))
      .then(() => {
        return ng([
          'generate', 'component', 'child-dir' + path.sep + '..' + path.sep + 'my-comp'
        ]);
      })
      .then(() => {
        const testPath =
          path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'my-comp', 'my-comp.component.ts');
        expect(pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it(path.sep + 'my-comp from a child dir, gens under ' + path.join('src', 'app'), (done) => {
    mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
    return Promise.resolve()
      .then(() => process.chdir(path.normalize('./src/app/1')))
      .then(() => ng(['generate', 'component', path.sep + 'my-comp']))
      .then(() => {
        const testPath =
          path.join(root, 'tmp', 'foo', 'src', 'app', 'my-comp', 'my-comp.component.ts');
        expect(pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it('..' + path.sep + 'my-comp from root dir will fail', (done) => {
    return ng(['generate', 'component', '..' + path.sep + 'my-comp'])
      .then(() => done.fail())
      .catch(err => {
        expect(err).toBe(`Invalid path: "..${path.sep}my-comp" cannot be above the "src${path.sep}app" directory`);
      })
      .then(done, done.fail);
  });

  it('mycomp will prefix selector', (done) => {
    return ng(['generate', 'component', 'mycomp'])
      .then(() => {
        const testPath =
          path.join(root, 'tmp', 'foo', 'src', 'app', 'mycomp', 'mycomp.component.ts');
        expect(pathExistsSync(testPath)).toBe(true);
        const contents = readFileSync(testPath, 'utf8');
        expect(contents.indexOf('selector: \'app-mycomp\'') === -1).toBe(false);
      })
      .then(done, done.fail);
  });

  it('mycomp --no-prefix will not prefix selector', (done) => {
    return ng(['generate', 'component', 'mycomp', '--no-prefix'])
      .then(() => {
        const testPath =
          path.join(root, 'tmp', 'foo', 'src', 'app', 'mycomp', 'mycomp.component.ts');
        expect(pathExistsSync(testPath)).toBe(true);
        const contents = readFileSync(testPath, 'utf8');
        expect(contents.indexOf('selector: \'mycomp\'') === -1).toBe(false);
      })
      .then(done, done.fail);
  });

  it('mycomp --prefix= will not prefix selector', (done) => {
    return ng(['generate', 'component', 'mycomp', '--prefix='])
      .then(() => {
        const testPath =
          path.join(root, 'tmp', 'foo', 'src', 'app', 'mycomp', 'mycomp.component.ts');
        expect(pathExistsSync(testPath)).toBe(true);
        const contents = readFileSync(testPath, 'utf8');
        expect(contents.indexOf('selector: \'mycomp\'') === -1).toBe(false);
      })
      .then(done, done.fail);
  });

  it('mycomp --prefix=test will prefix selector with \'test-\'', (done) => {
    return ng(['generate', 'component', 'mycomp', '--prefix=test'])
      .then(() => {
        const testPath =
          path.join(root, 'tmp', 'foo', 'src', 'app', 'mycomp', 'mycomp.component.ts');
        expect(pathExistsSync(testPath)).toBe(true);
        const contents = readFileSync(testPath, 'utf8');
        expect(contents.indexOf('selector: \'test-mycomp\'') === -1).toBe(false);
      })
      .then(done, done.fail);
  });

  it('myComp will succeed', (done) => {
    return ng(['generate', 'component', 'myComp'])
      .then(() => {
        const testPath =
          path.join(root, 'tmp', 'foo', 'src', 'app', 'my-comp', 'my-comp.component.ts');
        expect(pathExistsSync(testPath)).toBe(true);
      })
      .then(done, done.fail);
  });

  it(`non${path.sep}existing${path.sep}dir${path.sep}myComp will create dir and succeed`, (done) => {
    const testPath =
      path.join(root, 'tmp', 'foo', 'src', 'app', 'non', 'existing', 'dir', 'my-comp', 'my-comp.component.ts');
    const appModule = path.join(root, 'tmp', 'foo', 'src', 'app', 'app.module.ts');
    return ng(['generate', 'component', `non${path.sep}existing${path.sep}dir${path.sep}myComp`])
      .then(() => expect(pathExistsSync(testPath)).toBe(true))
      .then(() => readFile(appModule, 'utf-8'))
      .then(content => {
        // Expect that the app.module contains a reference to my-comp and its import.
        expect(content)
          .toMatch(/import.*MyCompComponent.*from '.\/non\/existing\/dir\/my-comp\/my-comp.component';/);
      })
      .then(done, done.fail);
  });

  it('my-comp --inline-template', (done) => {
    return ng(['generate', 'component', 'my-comp', '--inline-template']).then(() => {
      const testPath =
        path.join(root, 'tmp', 'foo', 'src', 'app', 'my-comp', 'my-comp.component.html');
      expect(pathExistsSync(testPath)).toBe(false);
    })
    .then(done, done.fail);
  });

  it('my-comp --inline-style', (done) => {
    return ng(['generate', 'component', 'my-comp', '--inline-style']).then(() => {
      const testPath =
        path.join(root, 'tmp', 'foo', 'src', 'app', 'my-comp', 'my-comp.component.css');
      expect(pathExistsSync(testPath)).toBe(false);
    })
    .then(done, done.fail);
  });

  it('my-comp --no-spec', (done) => {
    return ng(['generate', 'component', 'my-comp', '--no-spec']).then(() => {
      const testPath =
        path.join(root, 'tmp', 'foo', 'src', 'app', 'my-comp', 'my-comp.component.spec.ts');
      expect(pathExistsSync(testPath)).toBe(false);
    })
    .then(done, done.fail);
  });

  it('should error out when given an incorrect module path', (done) => {
    return Promise.resolve()
      .then(() => ng(['generate', 'component', 'baz', '--module', 'foo']))
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
        .then(() => ng(['generate', 'component', 'baz', '--module', 'app.module.ts']))
        .then(() => readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazComponent.*from '.\/baz\/baz.component';/);
          expect(content).toMatch(/declarations:\s+\[\r?\n\s+AppComponent,\r?\n\s+BazComponent\r?\n\s+\]/m);
        })
        .then(done, done.fail);
    });

    it('when given a root level module with missing module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/app.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'component', 'baz', '--module', 'app']))
        .then(() => readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazComponent.*from '.\/baz\/baz.component';/);
          expect(content).toMatch(/declarations:\s+\[\r?\n\s+AppComponent,\r?\n\s+BazComponent\r?\n\s+\]/m);
        })
        .then(done, done.fail);
    });

    it('when given a submodule with module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/foo/foo.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'module', 'foo']))
        .then(() => ng(['generate', 'component', 'baz', '--module', path.join('foo', 'foo.module.ts')]))
        .then(() => readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazComponent.*from '..\/baz\/baz.component';/);
          expect(content).toMatch(/declarations:\s+\[BazComponent]/m);
        })
        .then(done, done.fail);
    });

    it('when given a submodule with missing module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/foo/foo.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'module', 'foo']))
        .then(() => ng(['generate', 'component', 'baz', '--module', path.join('foo', 'foo')]))
        .then(() => readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazComponent.*from '..\/baz\/baz.component';/);
          expect(content).toMatch(/declarations:\s+\[BazComponent]/m);
        })
        .then(done, done.fail);
    });

    it('when given a submodule folder', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/foo/foo.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'module', 'foo']))
        .then(() => ng(['generate', 'component', 'baz', '--module', 'foo']))
        .then(() => readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazComponent.*from '..\/baz\/baz.component';/);
          expect(content).toMatch(/declarations:\s+\[BazComponent]/m);
        })
        .then(done, done.fail);
    });

    it('when given deep submodule folder with missing module.ts suffix', (done) => {
      const appRoot = path.join(root, 'tmp/foo');
      const modulePath = path.join(appRoot, 'src/app/foo/bar/bar.module.ts');

      return Promise.resolve()
        .then(() => ng(['generate', 'module', 'foo']))
        .then(() => ng(['generate', 'module', path.join('foo', 'bar')]))
        .then(() => ng(['generate', 'component', 'baz', '--module', path.join('foo', 'bar')]))
        .then(() => readFile(modulePath, 'utf-8'))
        .then(content => {
          expect(content).toMatch(/import.*BazComponent.*from '..\/..\/baz\/baz.component';/);
          expect(content).toMatch(/declarations:\s+\[BazComponent]/m);
        })
        .then(done, done.fail);
    });
  });
});
