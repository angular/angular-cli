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

describe('Acceptance: ng generate component', function () {
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

  it('ng generate component my-comp', function () {
    return ng(['generate', 'component', 'my-comp']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'client', 'app', 'my-comp', 'my-comp.component.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ng generate component test' + path.sep + 'my-comp', function () {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'client', 'app', 'test'));
    return ng(['generate', 'component', 'test' + path.sep + 'my-comp']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'client', 'app', 'test', 'my-comp', 'my-comp.component.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ng generate component test' + path.sep + '..' + path.sep + 'my-comp', function () {
    return ng(['generate', 'component', 'test' + path.sep + '..' + path.sep + 'my-comp'])
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'client', 'app', 'my-comp', 'my-comp.component.ts');
        expect(existsSync(testPath)).to.equal(true);
      });
  });

  it('ng generate component my-comp from a child dir', () => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'client', 'app', '1'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./client'))
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        return ng(['generate', 'component', 'my-comp'])
      })
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'client', 'app', '1', 'my-comp', 'my-comp.component.ts');
        expect(existsSync(testPath)).to.equal(true);
      }, err => console.log('ERR: ', err));
  });

  it('ng generate component child-dir' + path.sep + 'my-comp from a child dir', () => {
    fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'client', 'app', '1', 'child-dir'));
    return new Promise(function (resolve) {
      process.chdir('./src');
      resolve();
    })
      .then(() => process.chdir('./client'))
      .then(() => process.chdir('./app'))
      .then(() => process.chdir('./1'))
      .then(() => {
        return ng(['generate', 'component', 'child-dir' + path.sep + 'my-comp'])
      })
      .then(() => {
        var testPath = path.join(
          root, 'tmp', 'foo', 'src', 'client', 'app', '1', 'child-dir', 'my-comp', 'my-comp.component.ts');
        expect(existsSync(testPath)).to.equal(true);
      }, err => console.log('ERR: ', err));
  });

  it('ng generate component child-dir' + path.sep + '..' + path.sep + 'my-comp from a child dir',
    () => {
      fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'client', 'app', '1'));
      return new Promise(function (resolve) {
        process.chdir('./src');
        resolve();
      })
        .then(() => process.chdir('./client'))
        .then(() => process.chdir('./app'))
        .then(() => process.chdir('./1'))
        .then(() => {
          return ng([
            'generate', 'component', 'child-dir' + path.sep + '..' + path.sep + 'my-comp'
          ])
        })
        .then(() => {
          var testPath =
            path.join(root, 'tmp', 'foo', 'src', 'client', 'app', '1', 'my-comp', 'my-comp.component.ts');
          expect(existsSync(testPath)).to.equal(true);
        }, err => console.log('ERR: ', err));
    });

  it('ng generate component ' + path.sep + 'my-comp from a child dir, gens under ' +
    path.join('src', 'client', 'app'),
    () => {
      fs.mkdirsSync(path.join(root, 'tmp', 'foo', 'src', 'client', 'app', '1'));
      return new Promise(function (resolve) {
        process.chdir('./src');
        resolve();
      })
        .then(() => process.chdir('./client'))
        .then(() => process.chdir('./app'))
        .then(() => process.chdir('./1'))
        .then(() => {
          return ng(['generate', 'component', path.sep + 'my-comp'])
        })
        .then(() => {
          var testPath = path.join(root, 'tmp', 'foo', 'src', 'client', 'app', 'my-comp', 'my-comp.component.ts');
          expect(existsSync(testPath)).to.equal(true);
        }, err => console.log('ERR: ', err));
    });

  it('ng generate component ..' + path.sep + 'my-comp from root dir will fail', () => {
    return ng(['generate', 'component', '..' + path.sep + 'my-comp']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'client', 'app', '..', 'my-comp', 'my-comp.component.ts');
      expect(existsSync(testPath)).to.equal(false);
    });
  });
  
  it('ng generate component mycomp will fail: no dashes in name', () => {
    return ng(['generate', 'component', 'mycomp'])
      .then((exitCode) => {
        expect(exitCode).to.equal(1);
      });
  });
  
  it('ng generate component MYCOMP will fail: no dashes in name', () => {
    return ng(['generate', 'component', 'MYCOMP'])
      .then((exitCode) => {
        expect(exitCode).to.equal(1);
      });
  });
  
  it('ng generate component myComp will succeed', () => {
    return ng(['generate', 'component', 'myComp'])
      .then(() => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'client', 'app', 'my-comp', 'my-comp.component.ts');
        expect(existsSync(testPath)).to.equal(true);
      });
  });
  
  it('ng generate component my-comp --inline-template', function () {
    return ng(['generate', 'component', 'my-comp', '--inline-template']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'client', 'app', 'my-comp', 'my-comp.component.html');
      expect(existsSync(testPath)).to.equal(false);
    });
  });
  
  it('ng generate component my-comp --inline-style', function () {
    return ng(['generate', 'component', 'my-comp', '--inline-style']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'client', 'app', 'my-comp', 'my-comp.component.css');
      expect(existsSync(testPath)).to.equal(false);
    });
  });
});
