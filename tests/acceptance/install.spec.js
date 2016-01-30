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

describe('Acceptance: ng install', function() {
  before(function() {
    return tmp.setup('./tmp')
      .then(function() {
        process.chdir('./tmp');
      });
  });

  after(function() {
    conf.restore();
    this.timeout(100000);
    return tmp.teardown('./tmp');
  });

  function getFileContents(file) {
    var contents = fs.readFileSync(path.resolve(process.cwd(), 'src', 'app.ts'), 'utf8');
    return contents.split('\n');
  }

  function parsePackage(packageName) {
    var packagePath = path.resolve(process.cwd(), 'node_modules', packageName, packageName + '.ts');
    
    if (!existsSync(packagePath)) {
      return false;
    }

    var contents = fs.readFileSync(packagePath, 'utf8');
    var data = {};
    
    data.Directive = [];
    data.Pipe = [];
    data.Provider = [];
    data.styleUrl = [];

    var contentsArr = contents.split('\n');
    contentsArr.forEach(function(line, index) {
      if (/directives:/.test(line)) {
        data.Directive = parseData(line);
      }
      else if (/pipes:/.test(line)) {
        data.Pipe = parseData(line);
      }
      else if (/providers:/.test(line)) {
        data.Provider = parseData(line);
      }
      else if (/styles:/.test(line)) {
        //data.styles = this.parseData(line);
      }
      else if (/styleUrls:/.test(line)) {
        data.styleUrl = parseData(line);
      }
    });

    _.each(data, function(val, key) {
      if (!data[key].length) {
        delete data[key];
      }
    });

    return data;
  }

  function parseData(string) {
    var match = string.match(/\[(.*?)\]/)[0].replace(/\[/, '').replace(/\]/, '').replace(' ', '');
    return match.split(',');
  }

  it('ng install ng2-cli-test-lib --auto-injection, installs test library in right path', function() {
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
      ]).then(function(err) {
        var pkgPath = path.resolve(process.cwd(), 'node_modules', 'ng2-cli-test-lib');
        expect(existsSync(pkgPath)).to.be.true;
      });
    });
  });

  it('ng install ng2-cli-test-lib --auto-injection, test library has all expected files', function() {
    var pkgPath = path.resolve(process.cwd(), 'node_modules', 'ng2-cli-test-lib');
    var exports = path.resolve(pkgPath, 'ng2-cli-test-lib.ts');
    var bundlesPath = path.resolve(pkgPath, 'bundles');
    var exportedJS = path.resolve(bundlesPath, 'ng2-cli-test-lib.js');

    expect(existsSync(exports)).to.be.true;
    expect(existsSync(bundlesPath)).to.be.true;
    expect(existsSync(exportedJS)).to.be.true;
  });

  it('ng install ng2-cli-test-lib --auto-injection, imports library in bootstrap script', function() {
    var contentsArr = getFileContents(path.resolve(process.cwd(), 'src', 'app.ts'));
    var importExists = false;

    contentsArr.forEach(function(line) {
      if (/ng2-cli-test-lib/.test(line) && /import/.test(line)) {
        importExists = true;
      }
    });

    expect(importExists).to.be.true;
  });

  it('ng install ng2-cli-test-lib --skip-injection, installs test library in right path', function() {
    return ng([
      'uninstall',
      'ng2-cli-test-lib',
      '--auto-remove'
    ]).then(function() {
      return ng([
        'install',
        'ng2-cli-test-lib',
        '--skip-injection'
      ]).then(function() {
        var pkgPath = path.resolve(process.cwd(), 'node_modules', 'ng2-cli-test-lib');

        expect(existsSync(pkgPath)).to.be.true;
      });
    });
  });

  it('ng install ng2-cli-test-lib --skip-injection, test library has all expected files', function() {
    var pkgPath = path.resolve(process.cwd(), 'node_modules', 'ng2-cli-test-lib');
    var exports = path.resolve(pkgPath, 'ng2-cli-test-lib.ts');
    var bundlesPath = path.resolve(pkgPath, 'bundles');
    var exportedJS = path.resolve(bundlesPath, 'ng2-cli-test-lib.js');

    expect(existsSync(exports)).to.be.true;
    expect(existsSync(bundlesPath)).to.be.true;
    expect(existsSync(exportedJS)).to.be.true;
  });

});

