'use strict';

var fs = require('fs-extra');
var ng = require('../helpers/ng');
var existsSync = require('exists-sync');
var expect = require('chai').expect;
var forEach = require('lodash/collection/forEach');
var walkSync = require('walk-sync');
var Blueprint = require('ember-cli/lib/models/blueprint');
var path = require('path');
var tmp = require('../helpers/tmp');
var root = process.cwd();
var util = require('util');
var conf = require('ember-cli/tests/helpers/conf');
var EOL = require('os').EOL;
var path = require('path');
var Promise = require('ember-cli/lib/ext/promise');

describe('Acceptance: ng generate pipe', function() {
  before(conf.setup);

  after(conf.restore);

  beforeEach(function() {
    return tmp.setup('./tmp')
      .then(function() {
        process.chdir('./tmp');
      })
      .then(function(){
        return ng([
          'new',
          'foo',
          '--skip-npm',
          '--skip-bower'
        ]);
      });
  });

  afterEach(function() {
    this.timeout(10000);

    // return tmp.teardown('./tmp');
  });

  it('ng generate pipe my-comp', function() {
    return ng([
      'generate',
      'pipe',
      'my-comp'
    ])
    .then(_ => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'my-comp', 'my-comp.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ng generate pipe test' + path.sep + 'my-comp', function() {
    return ng([
      'generate',
      'pipe',
      'test' + path.sep + 'my-comp'
    ])
    .then(_ => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'test', 'my-comp', 'my-comp.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ng generate pipe test' + path.sep + '..' + path.sep + 'my-comp', function() {
    return ng([
      'generate',
      'pipe',
      'test' + path.sep + '..' + path.sep + 'my-comp'
    ])
    .then(_ => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'my-comp', 'my-comp.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });
  
  it('ng generate pipe my-comp from a child dir', () => {
    return new Promise(function (resolve, reject) {
        process.chdir('./src');
        resolve();
      })
      .then(_ => process.chdir('./app'))
      .then(_ => fs.mkdirsSync('./1'))
      .then(_ => process.chdir('./1'))
      .then(_ => {
        process.env.CWD = process.cwd();
        return ng([
          'generate',
          'pipe',
          'my-comp'
        ])
      })
      .then(_ => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'my-comp', 'my-comp.ts');
        expect(existsSync(testPath)).to.equal(true);
      }, err => console.log('ERR: ', err));
  });
  
  it('ng generate pipe child-dir' + path.sep + 'my-comp from a child dir', () => {
    return new Promise(function (resolve, reject) {
        process.chdir('./src');
        resolve();
      })
      .then(_ => process.chdir('./app'))
      .then(_ => fs.mkdirsSync('./1'))
      .then(_ => process.chdir('./1'))
      .then(_ => {
        process.env.CWD = process.cwd();
        return ng([
          'generate',
          'pipe',
          'child-dir' + path.sep + 'my-comp'
        ])
      })
      .then(_ => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'child-dir', 'my-comp', 'my-comp.ts');
        expect(existsSync(testPath)).to.equal(true);
      }, err => console.log('ERR: ', err));
  });
  
  it('ng generate pipe child-dir' + path.sep + '..' + path.sep + 'my-comp from a child dir', () => {
    return new Promise(function (resolve, reject) {
        process.chdir('./src');
        resolve();
      })
      .then(_ => process.chdir('./app'))
      .then(_ => fs.mkdirsSync('./1'))
      .then(_ => process.chdir('./1'))
      .then(_ => {
        process.env.CWD = process.cwd();
        return ng([
          'generate',
          'pipe',
          'child-dir' + path.sep + '..' + path.sep + 'my-comp'
        ])
      })
      .then(_ => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', '1', 'my-comp', 'my-comp.ts');
        expect(existsSync(testPath)).to.equal(true);
      }, err => console.log('ERR: ', err));
  });
  
  it('ng generate pipe ' + path.sep + 'my-comp from a child dir, gens under ' + path.join('src', 'app'), () => {
    return new Promise(function (resolve, reject) {
        process.chdir('./src');
        resolve();
      })
      .then(_ => process.chdir('./app'))
      .then(_ => fs.mkdirsSync('./1'))
      .then(_ => process.chdir('./1'))
      .then(_ => {
        process.env.CWD = process.cwd();
        return ng([
          'generate',
          'pipe',
          path.sep + 'my-comp'
        ])
      })
      .then(_ => {
        var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'my-comp', 'my-comp.ts');
        expect(existsSync(testPath)).to.equal(true);
      }, err => console.log('ERR: ', err));
  });
  
  it('ng generate pipe ..' + path.sep + 'my-comp from root dir will fail', () => {
    return ng([
      'generate',
      'pipe',
      '..' + path.sep + 'my-comp'
    ])
    .then(_ => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', '..', 'my-comp', 'my-comp.ts');
      expect(existsSync(testPath)).to.equal(false);
    });
  });
});