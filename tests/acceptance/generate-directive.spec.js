'use strict';

var fs = require('fs-extra');
var ng = require('../helpers/ng');
var existsSync = require('exists-sync');
var expect = require('chai').expect;
var path = require('path');
var tmp = require('../helpers/tmp');
var root = process.cwd();
var Promise = require('angular-cli/ember-cli/lib/ext/promise');
var SilentError = require('silent-error');
const denodeify = require('denodeify');

const readFile = denodeify(fs.readFile);


describe('Acceptance: ng generate directive', function () {
  beforeEach(function () {
    return tmp.setup('./tmp').then(function () {
      process.chdir('./tmp');
    }).then(function () {
      return ng(['new', 'foo', '--skip-npm', '--skip-bower']);
    });
  });

  afterEach(function () {
    this.timeout(10000);

    return tmp.teardown('./tmp');
  });

  it('flat', function () {
    return ng(['generate', 'directive', 'flat']).then(() => {
      var testPath = path.join(root, 'tmp/foo/src/app/flat.directive.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('dir-test --flat false', function () {
    const appRoot = path.join(root, 'tmp/foo');
    const testPath = path.join(appRoot, 'src/app/dir-test/dir-test.directive.ts');
    const testSpecPath = path.join(appRoot, 'src/app/dir-test/dir-test.directive.spec.ts');
    const appModulePath = path.join(appRoot, 'src/app/app.module.ts');

    return ng(['generate', 'directive', 'dir-test', '--flat', 'false'])
      .then(() => {
        expect(existsSync(testPath)).to.equal(true);
        expect(existsSync(testSpecPath)).to.equal(true);
      })
      .then(() => readFile(appModulePath, 'utf-8'))
      .then(content => {
        expect(content).matches(/import.*\bDirTestDirective\b.*from '.\/dir-test\/dir-test.directive';/);
        expect(content).matches(/declarations:\s*\[[^\]]+?,\r?\n\s+DirTestDirective\r?\n/m);
      });
  });

  it('dir-test --flat false --no-spec', function () {
    const appRoot = path.join(root, 'tmp/foo');
    const testPath = path.join(appRoot, 'src/app/dir-test/dir-test.directive.ts');
    const testSpecPath = path.join(appRoot, 'src/app/dir-test/dir-test.directive.spec.ts');

    return ng(['generate', 'directive', 'dir-test', '--flat', 'false', '--no-spec'])
      .then(() => {
        expect(existsSync(testPath)).to.equal(true);
        expect(existsSync(testSpecPath)).to.equal(false);
      });
  });

  it('test' + path.sep + 'dir-test', function () {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', 'test'));
    return ng(['generate', 'directive', 'test' + path.sep + 'dir-test', '--flat', 'false']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'test', 'dir-test', 'dir-test.directive.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('test' + path.sep + '..' + path.sep + 'dir-test', function () {
    return ng(['generate', 'directive', 'test' + path.sep + '..' + path.sep + 'dir-test', '--flat', 'false'])
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'dir-test', 'dir-test.directive.ts');
        expect(existsSync(testPath)).to.equal(true);
      });
  });

  it('dir-test from a child dir', () => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        process.env.CWD = process.cwd();
        return ng(['generate', 'directive', 'dir-test', '--flat', 'false'])
      })
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'dir-test', 'dir-test.directive.ts');
        expect(existsSync(testPath)).to.equal(true);
      });
  });

  it('child-dir' + path.sep + 'dir-test from a child dir', () => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        process.env.CWD = process.cwd();
        return ng(['generate', 'directive', 'child-dir' + path.sep + 'dir-test', '--flat', 'false'])
      })
      .then(() => {
        var testPath = path.join(
          root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir', 'dir-test', 'dir-test.directive.ts');
        expect(existsSync(testPath)).to.equal(true);
      });
  });

  it('child-dir' + path.sep + '..' + path.sep + 'dir-test from a child dir',
    () => {
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
            ['generate', 'directive', 'child-dir' + path.sep + '..' + path.sep + 'dir-test', '--flat', 'false'])
        })
        .then(() => {
          var testPath =
            path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'dir-test', 'dir-test.directive.ts');
          expect(existsSync(testPath)).to.equal(true);
        });
    });

  it(path.sep + 'dir-test from a child dir, gens under ' +
    path.join('src', 'app'),
    () => {
      fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
      return new Promise(function (resolve) {
        process.chdir('./src');
        resolve();
      })
        .then(() => process.chdir('./app'))
        .then(() => process.chdir('./1'))
        .then(() => {
          process.env.CWD = process.cwd();
          return ng(['generate', 'directive', path.sep + 'dir-test', '--flat', 'false'])
        })
        .then(() => {
          var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'dir-test', 'dir-test.directive.ts');
          expect(existsSync(testPath)).to.equal(true);
        });
    });

  it('..' + path.sep + 'dir-test from root dir will fail', () => {
    return ng(['generate', 'directive', '..' + path.sep + 'dir-test']).then(() => {
      throw new SilentError(`ng generate directive ..${path.sep}dir-test from root dir should fail.`);
    }, (err) => {
      expect(err).to.equal(`Invalid path: "..${path.sep}dir-test" cannot be above the "src${path.sep}app" directory`);
    });
  });

  it('converts dash-cased-name to a camelCasedSelector', () => {
    const appRoot = path.join(root, 'tmp/foo');
    const directivePath = path.join(appRoot, 'src/app/dir-test.directive.ts');
    return ng(['generate', 'directive', 'dir-test'])
      .then(() => readFile(directivePath, 'utf-8'))
      .then(content => {
        // expect(content).matches(/selector: [app-dir-test]/m);
        expect(content).matches(/selector: '\[appDirTest\]'/);
      });
  });

  it('a-test-directive should generate file a-test.directive', function(){
    return ng(['generate', 'directive', 'a-test-directive']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'a-test.directive.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ATestDirective should generate file atest.directive', function(){
    return ng(['generate', 'directive', 'ATestDirective']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'atest.directive.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('atestdirective should generate file atest.directive', function(){
    return ng(['generate', 'directive', 'atestdirective']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'atest.directive.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('a-test-component should should ignore suffix removal', function(){
    return ng(['generate', 'directive', 'a-test-component']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'a-test-component.directive.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('name a-test-directive generates ATestDirective directive name not ATestDirectiveDirective', function () {
    let testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'a-test.directive.ts');
    return ng(['generate', 'directive', 'a-test-directive'])
      .then(() => {
        expect(existsSync(testPath)).to.equal(true);
      })
      .then(() => readFile(testPath, 'utf-8'))
      .then(content => {
        expect(content).to.matches(/^export\sclass\s(ATestDirective)/m);
      });
  });
});
