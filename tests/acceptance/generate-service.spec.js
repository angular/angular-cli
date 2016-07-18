/*eslint-disable no-console */
'use strict';

var fs = require('fs-extra');
var ng = require('../helpers/ng');
var existsSync = require('exists-sync');
var expect = require('chai').expect;
var path = require('path');
var tmp = require('../helpers/tmp');
var root = process.cwd();
var conf = require('ember-cli/tests/helpers/conf');
var Promise = require('ember-cli/lib/ext/promise');
var SilentError = require('silent-error');

describe('Acceptance: ng generate service', function () {
  before(conf.setup);

  after(conf.restore);

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

  it('ng generate service my-svc', function () {
    return ng(['generate', 'service', 'my-svc']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'my-svc.service.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ng generate service test' + path.sep + 'my-svc', function () {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'app', 'test'));
    return ng(['generate', 'service', 'test' + path.sep + 'my-svc']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'test', 'my-svc.service.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ng generate service test' + path.sep + '..' + path.sep + 'my-svc', function () {
    return ng(['generate', 'service', 'test' + path.sep + '..' + path.sep + 'my-svc']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'my-svc.service.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ng generate service my-svc from a child dir', () => {
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
      }, err => console.log('ERR: ', err));
  });

  it('ng generate service child-dir' + path.sep + 'my-svc from a child dir', () => {
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
      }, err => console.log('ERR: ', err));
  });

  it('ng generate service child-dir' + path.sep + '..' + path.sep + 'my-svc from a child dir',
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
        }, err => console.log('ERR: ', err));
    });

  it('ng generate service ' + path.sep + 'my-svc from a child dir, gens under ' +
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
        }, err => console.log('ERR: ', err));
    });

  it('ng generate service ..' + path.sep + 'my-svc from root dir will fail', () => {
    return ng(['generate', 'service', '..' + path.sep + 'my-svc']).then(() => {
      throw new SilentError(`ng generate service ..${path.sep}my-svc from root dir should fail.`);
    }, (err) => {
      expect(err).to.equal(`Invalid path: "..${path.sep}my-svc" cannot be above the "src${path.sep}app" directory`);
    });
  });
});
