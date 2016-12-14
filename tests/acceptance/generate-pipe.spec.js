/*eslint-disable no-console */
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


describe('Acceptance: ng generate pipe', function () {
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

  it('ng generate pipe pipe-test', function () {
    const appRoot = path.join(root, 'tmp/foo');
    const testPath = path.join(appRoot, 'src/app/pipe-test.pipe.ts');
    const testSpecPath = path.join(appRoot, 'src/app/pipe-test.pipe.spec.ts');
    const appModulePath = path.join(appRoot, 'src/app/app.module.ts');
    return ng(['generate', 'pipe', 'pipe-test'])
      .then(() => {
        expect(existsSync(testPath)).to.equal(true);
        expect(existsSync(testSpecPath)).to.equal(true);
      })
      .then(() => readFile(appModulePath, 'utf-8'))
      .then(content => {
        expect(content).matches(/import.*\bPipeTestPipe\b.*from '.\/pipe-test.pipe';/);
        expect(content).matches(/declarations:\s*\[[^\]]+?,\r?\n\s+PipeTestPipe\r?\n/m);
      });
  });

  it('ng generate pipe pipe-test --no-spec', function () {
    const appRoot = path.join(root, 'tmp/foo');
    const testPath = path.join(appRoot, 'src/app/pipe-test.pipe.ts');
    const testSpecPath = path.join(appRoot, 'src/app/pipe-test.pipe.spec.ts');

    return ng(['generate', 'pipe', 'pipe-test', '--no-spec'])
      .then(() => {
        expect(existsSync(testPath)).to.equal(true);
        expect(existsSync(testSpecPath)).to.equal(false);
      });
  });

  it('ng generate pipe test' + path.sep + 'pipe-test', function () {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', 'test'));
    return ng(['generate', 'pipe', 'test' + path.sep + 'pipe-test']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'test', 'pipe-test.pipe.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ng generate pipe test' + path.sep + '..' + path.sep + 'pipe-test', function () {
    return ng(['generate', 'pipe', 'test' + path.sep + '..' + path.sep + 'pipe-test']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'pipe-test.pipe.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ng generate pipe pipe-test from a child dir', () => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        process.env.CWD = process.cwd();
        return ng(['generate', 'pipe', 'pipe-test'])
      })
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'pipe-test.pipe.ts');
        expect(existsSync(testPath)).to.equal(true);
      }, err => console.log('ERR: ', err));
  });

  it('ng generate pipe child-dir' + path.sep + 'pipe-test from a child dir', () => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        process.env.CWD = process.cwd();
        return ng(['generate', 'pipe', 'child-dir' + path.sep + 'pipe-test'])
      })
      .then(() => {
        var testPath = path.join(
          root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir', 'pipe-test.pipe.ts');
        expect(existsSync(testPath)).to.equal(true);
      }, err => console.log('ERR: ', err));
  });

  it('ng generate pipe child-dir' + path.sep + '..' + path.sep + 'pipe-test from a child dir', () => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        process.env.CWD = process.cwd();
        return ng(['generate', 'pipe', 'child-dir' + path.sep + '..' + path.sep + 'pipe-test'])
      })
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'pipe-test.pipe.ts');
        expect(existsSync(testPath)).to.equal(true);
      }, err => console.log('ERR: ', err));
  });

  it('ng generate pipe ' + path.sep + 'pipe-test from a child dir, gens under ' +
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
          return ng(['generate', 'pipe', path.sep + 'pipe-test'])
        })
        .then(() => {
          var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'pipe-test.pipe.ts');
          expect(existsSync(testPath)).to.equal(true);
        }, err => console.log('ERR: ', err));
    });

  it('ng generate pipe ..' + path.sep + 'pipe-test from root dir will fail', () => {
    return ng(['generate', 'pipe', '..' + path.sep + 'pipe-test']).then(() => {
      throw new SilentError(`ng generate pipe ..${path.sep}pipe-test from root dir should fail.`);
    }, (err) => {
      expect(err).to.equal(`Invalid path: "..${path.sep}pipe-test" cannot be above the "src${path.sep}app" directory`);
    });
  });

  it('a-test-pipe should generate file a-test.pipe', function(){
    return ng(['generate', 'pipe', 'a-test-pipe']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'a-test.pipe.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ATestPipe should generate file atest.pipe', function(){
    return ng(['generate', 'pipe', 'ATestPipe']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'atest.pipe.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('atestpipe should generate file atest.pipe', function(){
    return ng(['generate', 'pipe', 'atestpipe']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'atest.pipe.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('a-test-component should should ignore suffix removal', function(){
    return ng(['generate', 'pipe', 'a-test-component']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'a-test-component.pipe.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('name a-test-pipe generates ATestPipe pipe name not ATestPipePipe', function () {
    let testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'a-test.pipe.ts');
    return ng(['generate', 'pipe', 'a-test-pipe'])
      .then(() => {
        expect(existsSync(testPath)).to.equal(true);
      })
      .then(() => readFile(testPath, 'utf-8'))
      .then(content => {
        expect(content).to.matches(/^export\sclass\s(ATestPipe)/m);
      });
  });

});
