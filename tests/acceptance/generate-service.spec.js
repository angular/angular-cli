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


describe('Acceptance: ung generate service', function () {
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

  it('ung generate service my-svc', function () {
    const appRoot = path.join(root, 'tmp/foo');
    const testPath = path.join(appRoot, 'src/app/my-svc.service.ts');
    const testSpecPath = path.join(appRoot, 'src/app/my-svc.service.spec.ts');
    const appModulePath = path.join(appRoot, 'src/app/app.module.ts');

    return ng(['generate', 'service', 'my-svc'])
      .then(() => {
        expect(existsSync(testPath)).to.equal(true);
        expect(existsSync(testSpecPath)).to.equal(true);
      })
      .then(() => readFile(appModulePath, 'utf-8'))
      .then(content => {
        expect(content).not.to.matches(/import.*\MySvcService\b.*from '.\/my-svc.service';/);
        expect(content).not.to.matches(/providers:\s*\[MySvcService\]/m);
      });
  });

  it('ung generate service my-svc --no-spec', function () {
    const appRoot = path.join(root, 'tmp/foo');
    const testPath = path.join(appRoot, 'src/app/my-svc.service.ts');
    const testSpecPath = path.join(appRoot, 'src/app/my-svc.service.spec.ts');
    const appModulePath = path.join(appRoot, 'src/app/app.module.ts');

    return ng(['generate', 'service', 'my-svc', '--no-spec'])
      .then(() => {
        expect(existsSync(testPath)).to.equal(true);
        expect(existsSync(testSpecPath)).to.equal(false);
      })
      .then(() => readFile(appModulePath, 'utf-8'))
      .then(content => {
        expect(content).not.to.matches(/import.*\MySvcService\b.*from '.\/my-svc.service';/);
        expect(content).not.to.matches(/providers:\s*\[MySvcService\]/m);
      });
  });

  it('ung generate service test' + path.sep + 'my-svc', function () {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', 'test'));
    return ng(['generate', 'service', 'test' + path.sep + 'my-svc']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'test', 'my-svc.service.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ung generate service test' + path.sep + '..' + path.sep + 'my-svc', function () {
    return ng(['generate', 'service', 'test' + path.sep + '..' + path.sep + 'my-svc']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'my-svc.service.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ung generate service my-svc from a child dir', () => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        process.env.CWD = process.cwd();
        return ng(['generate', 'service', 'my-svc'])
      })
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'my-svc.service.ts');
        expect(existsSync(testPath)).to.equal(true);
      });
  });

  it('ung generate service child-dir' + path.sep + 'my-svc from a child dir', () => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        process.env.CWD = process.cwd();
        return ng(['generate', 'service', 'child-dir' + path.sep + 'my-svc'])
      })
      .then(() => {
        var testPath = path.join(
          root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir', 'my-svc.service.ts');
        expect(existsSync(testPath)).to.equal(true);
      });
  });

  it('ung generate service child-dir' + path.sep + '..' + path.sep + 'my-svc from a child dir',
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
            ['generate', 'service', 'child-dir' + path.sep + '..' + path.sep + 'my-svc'])
        })
        .then(() => {
          var testPath =
            path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'my-svc.service.ts');
          expect(existsSync(testPath)).to.equal(true);
        });
    });

  it('ung generate service ' + path.sep + 'my-svc from a child dir, gens under ' +
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
          return ng(['generate', 'service', path.sep + 'my-svc'])
        })
        .then(() => {
          var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'my-svc.service.ts');
          expect(existsSync(testPath)).to.equal(true);
        });
    });

  it('ung generate service ..' + path.sep + 'my-svc from root dir will fail', () => {
    return ng(['generate', 'service', '..' + path.sep + 'my-svc']).then(() => {
      throw new SilentError(`ung generate service ..${path.sep}my-svc from root dir should fail.`);
    }, (err) => {
      expect(err).to.equal(`Invalid path: "..${path.sep}my-svc" cannot be above the "src${path.sep}app" directory`);
    });
  });
});
