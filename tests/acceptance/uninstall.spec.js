'use strict';

var fs         = require('fs');
var ng         = require('../helpers/ng');
var existsSync = require('exists-sync');
var expect     = require('chai').expect;
var walkSync   = require('walk-sync');
var path       = require('path');
var tmp        = require('../helpers/tmp');
var root       = process.cwd();
var conf       = require('ember-cli/tests/helpers/conf');
var _          = require('lodash');

describe('Acceptance: ng uninstall', function() {
  before(function() {
    return tmp.setup('./tmp')
      .then(function() {
        process.chdir('./tmp');
        return ng([
          'new',
          'foo',
          '--skip-npm',
          '--skip-bower'
        ]).then(function() {
          return ng([
            'install',
            'ng2-cli-test-lib',
            '--auto-injection'
          ]);
        });
      });
  });

  after(function() {
    conf.restore();
    this.timeout(100000);
    return tmp.teardown('./tmp');
  });

  it('ng uninstall ng2-cli-test-lib --auto-remove, removes test library', function() {
    return ng([
      'uninstall',
      'ng2-cli-test-lib',
      '--auto-remove'
    ]).then(function() {
      var pkgPath = path.resolve(process.cwd(), 'node_modules', 'ng2-cli-test-lib');
      expect(!existsSync(pkgPath));
    });
  });

});