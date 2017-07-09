// tslint:disable:max-line-length
import * as fs from 'fs-extra';
import * as path from 'path';
import * as util from 'util';
import { EOL } from 'os';
import { forEach } from 'lodash';
import { ng } from '../helpers';

const tmp = require('../helpers/tmp');
const walkSync = require('walk-sync');
const Blueprint = require('@angular/cli/ember-cli/lib/models/blueprint');

const root = process.cwd();


describe('Acceptance: ng new', function () {
  let originalTimeout: number;

  beforeEach((done) => {
    // Increase timeout for these tests only.
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

    spyOn(console, 'error');

    tmp.setup('./tmp')
      .then(() => process.chdir('./tmp'))
      .then(() => done());
  }, 10000);

  afterEach((done) => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    tmp.teardown('./tmp').then(() => done());
  });

  function confirmBlueprintedForDir(dir: string) {
    return function () {
      let blueprintPath = path.join(root, dir, 'files');
      let expected: string[] = walkSync(blueprintPath);
      let actual = walkSync('.').sort();
      let directory = path.basename(process.cwd());

      forEach(Blueprint.renamedFiles, function (destFile, srcFile) {
        expected[expected.indexOf(srcFile)] = destFile;
      });

      expected.forEach(function (file, index) {
        expected[index] = file.replace(/__name__/g, '@angular/cli');
      });

      expected.sort();

      expect(directory).toBe('foo');
      expect(expected).toEqual(
        actual,
        EOL + ' expected: ' + util.inspect(expected) + EOL + ' but got: ' + util.inspect(actual));

    };
  }

  function confirmBlueprinted() {
    return confirmBlueprintedForDir('blueprints/ng');
  }

  it('requires a valid name (!)', (done) => {
    return ng(['new', '!', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => done.fail(), () => done());
  });
  it('requires a valid name (abc-.)', (done) => {
    return ng(['new', 'abc-.', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => done.fail(), () => done());
  });
  it('requires a valid name (abc-)', (done) => {
    return ng(['new', 'abc-', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => done.fail(), () => done());
  });
  it('requires a valid name (abc-def-)', (done) => {
    return ng(['new', 'abc-def-', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => done.fail(), () => done());
  });
  it('requires a valid name (abc-123)', (done) => {
    return ng(['new', 'abc-123', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => done.fail(), () => done());
  });
  it('requires a valid name (abc)', (done) => {
    return ng(['new', 'abc', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => done(), () => done.fail());
  });
  it('requires a valid name (abc-def)', (done) => {
    return ng(['new', 'abc-def', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => done(), () => done.fail());
  });

  it('ng new foo, where foo does not yet exist, works', (done) => {
    return ng(['new', 'foo', '--skip-install'])
      .then(confirmBlueprinted)
      .then(done, done.fail);
  });

  it('ng new with empty app does throw exception', (done) => {
    return ng(['new', ''])
      .then(() => done.fail(), () => done());
  });

  it('ng new without app name does throw exception', (done) => {
    return ng(['new'])
      .then(() => done.fail(), () => done());
  });

  it('ng new with app name creates new directory and has a dasherized package name', (done) => {
    return ng(['new', 'FooApp', '--skip-install', '--skip-git']).then(() => {
      expect(!fs.pathExistsSync('FooApp'));

      const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      expect(pkgJson.name).toBe('foo-app');
    })
    .then(done, done.fail);
  });

  it('ng new has a .editorconfig file', (done) => {
    return ng(['new', 'FooApp', '--skip-install', '--skip-git']).then(() => {
      expect(!fs.pathExistsSync('FooApp'));

      const editorConfig = fs.readFileSync('.editorconfig', 'utf8');
      expect(editorConfig).toBeDefined();
    })
    .then(done, done.fail);
  });

  it('Cannot run ng new, inside of Angular CLI project', (done) => {
    return ng(['new', 'foo', '--skip-install', '--skip-git'])
      .then(() => {
        return ng(['new', 'foo', '--skip-install', '--skip-git']).then(() => {
          done.fail();
        }, () => {
          expect(!fs.pathExistsSync('foo'));
        });
      })
      .then(confirmBlueprinted)
      .then(done, done.fail);
  });

  it('ng new without skip-git flag creates .git dir', (done) => {
    return ng(['new', 'foo', '--skip-install']).then(() => {
      expect(fs.pathExistsSync('.git'));
    })
    .then(done, done.fail);
  });

  it('ng new with --dry-run does not create new directory', (done) => {
    return ng(['new', 'foo', '--dry-run']).then(() => {
      const cwd = process.cwd();
      expect(cwd).not.toMatch(/foo/, 'does not change cwd to foo in a dry run');
      expect(fs.pathExistsSync(path.join(cwd, 'foo'))).toBe(false, 'does not create new directory');
      expect(fs.pathExistsSync(path.join(cwd, '.git'))).toBe(false, 'does not create git in current directory');
    })
    .then(done, done.fail);
  });

  it('ng new with --directory uses given directory name and has correct package name', (done) => {
    return ng(['new', 'foo', '--skip-install', '--skip-git', '--directory=bar'])
      .then(() => {
        const cwd = process.cwd();
        expect(cwd).not.toMatch(/foo/, 'does not use app name for directory name');
        expect(fs.pathExistsSync(path.join(cwd, 'foo'))).toBe(false, 'does not create new directory with app name');

        expect(cwd).toMatch(/bar/, 'uses given directory name');
        expect(fs.pathExistsSync(path.join(cwd, '..', 'bar'))).toBe(true, 'creates new directory with specified name');

        const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        expect(pkgJson.name).toBe('foo', 'uses app name for package name');
      })
      .then(done, done.fail);
  });

  it('ng new --inline-template does not generate a template file', (done) => {
    return ng(['new', 'foo', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => {
        const templateFile = path.join('src', 'app', 'app.component.html');
        expect(fs.pathExistsSync(templateFile)).toBe(false);
      })
      .then(done, done.fail);
  });

  it('ng new --inline-style does not gener a style file', (done) => {
    return ng(['new', 'foo', '--skip-install', '--skip-git', '--inline-style'])
      .then(() => {
        const styleFile = path.join('src', 'app', 'app.component.css');
        expect(fs.pathExistsSync(styleFile)).toBe(false);
      })
      .then(done, done.fail);
  });

  it('should skip spec files when passed --skip-tests', (done) => {
    return ng(['new', 'foo', '--skip-install', '--skip-git', '--skip-tests'])
      .then(() => {
        const specFile = path.join('src', 'app', 'app.component.spec.ts');
        expect(fs.pathExistsSync(specFile)).toBe(false);
      })
      .then(done, done.fail);
  });

});
