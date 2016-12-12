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


describe('Acceptance: ng generate component', function () {
  beforeEach(function () {
    this.timeout(10000);
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

  it('comp-test', function () {
    const testPath = path.join(root, 'tmp/foo/src/app/comp-test/comp-test.component.ts');
    const appModule = path.join(root, 'tmp/foo/src/app/app.module.ts');
    return ng(['generate', 'component', 'comp-test'])
      .then(() => expect(existsSync(testPath)).to.equal(true))
      .then(() => readFile(appModule, 'utf-8'))
      .then(content => {
        // Expect that the app.module contains a reference to comp-test and its import.
        expect(content).matches(/import.*CompTestComponent.*from '.\/comp-test\/comp-test.component';/);
        expect(content).matches(/declarations:\s*\[[^\]]+?,\r?\n\s+CompTestComponent\r?\n/m);
      });
  });

  it('test' + path.sep + 'comp-test', function () {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', 'test'));
    return ng(['generate', 'component', 'test' + path.sep + 'comp-test']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'test', 'comp-test', 'comp-test.component.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('test' + path.sep + '..' + path.sep + 'comp-test', function () {
    return ng(['generate', 'component', 'test' + path.sep + '..' + path.sep + 'comp-test'])
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'comp-test', 'comp-test.component.ts');
        expect(existsSync(testPath)).to.equal(true);
      });
  });

  it('comp-test from a child dir', () => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        return ng(['generate', 'component', 'comp-test'])
      })
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'comp-test', 'comp-test.component.ts');
        expect(existsSync(testPath)).to.equal(true);
      });
  });

  it('child-dir' + path.sep + 'comp-test from a child dir', () => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        return ng(['generate', 'component', 'child-dir' + path.sep + 'comp-test'])
      })
      .then(() => {
        var testPath = path.join(
          root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir', 'comp-test', 'comp-test.component.ts');
        expect(existsSync(testPath)).to.equal(true);
      });
  });

  it('child-dir' + path.sep + '..' + path.sep + 'comp-test from a child dir', () => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
    return Promise.resolve()
      .then(() => process.chdir(path.normalize('./src/app/1')))
      .then(() => {
        return ng([
          'generate', 'component', 'child-dir' + path.sep + '..' + path.sep + 'comp-test'
        ])
      })
      .then(() => {
        var testPath =
          path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'comp-test', 'comp-test.component.ts');
        expect(existsSync(testPath)).to.equal(true);
      });
  });

  it(path.sep + 'comp-test from a child dir, gens under ' + path.join('src', 'app'), () => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
    return Promise.resolve()
      .then(() => process.chdir(path.normalize('./src/app/1')))
      .then(() => {
        return ng(['generate', 'component', path.sep + 'comp-test'])
      })
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'comp-test', 'comp-test.component.ts');
        expect(existsSync(testPath)).to.equal(true);
      });
  });

  it('..' + path.sep + 'comp-test from root dir will fail', () => {
    return ng(['generate', 'component', '..' + path.sep + 'comp-test']).then(() => {
      throw new SilentError(`ng generate component ..${path.sep}comp-test from root dir should fail.`);
    }, (err) => {
      expect(err).to.equal(`Invalid path: "..${path.sep}comp-test" cannot be above the "src${path.sep}app" directory`);
    });
  });

  it('comptest will prefix selector', () => {
    return ng(['generate', 'component', 'comptest'])
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'comptest', 'comptest.component.ts');
        expect(existsSync(testPath)).to.equal(true);
        var contents = fs.readFileSync(testPath, 'utf8');
        expect(contents.indexOf('selector: \'app-comptest\'') === -1).to.equal(false);
      });
  });

  it('comptest --no-prefix will not prefix selector', () => {
    return ng(['generate', 'component', 'comptest', '--no-prefix'])
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'comptest', 'comptest.component.ts');
        expect(existsSync(testPath)).to.equal(true);
        var contents = fs.readFileSync(testPath, 'utf8');
        expect(contents.indexOf('selector: \'comptest\'') === -1).to.equal(false);
      });
  });

  it('myComp will succeed', () => {
    return ng(['generate', 'component', 'compTest'])
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'comp-test', 'comp-test.component.ts');
        expect(existsSync(testPath)).to.equal(true);
      });
  });

  it('comp-test --inline-template', function () {
    return ng(['generate', 'component', 'comp-test', '--inline-template']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'comp-test', 'comp-test.component.html');
      expect(existsSync(testPath)).to.equal(false);
    });
  });

  it('comp-test --inline-style', function () {
    return ng(['generate', 'component', 'comp-test', '--inline-style']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'comp-test', 'comp-test.component.css');
      expect(existsSync(testPath)).to.equal(false);
    });
  });

  it('comp-test --no-spec', function() {
    return ng(['generate', 'component', 'comp-test', '--no-spec']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'comp-test', 'comp-test.component.spec.ts');
      expect(existsSync(testPath)).to.equal(false);
    });
  });

  it('comp-test-component should rename to comp-test', function(){
    return ng(['generate', 'component', 'comp-test-component']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'comp-test', 'comp-test.component.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('comptestcomponent should rename to comptest', function(){
    return ng(['generate', 'component', 'comptestcomponent']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'comptest', 'comptest.component.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });
});
