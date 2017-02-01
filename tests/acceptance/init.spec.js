'use strict';

var ng = require('../helpers/ng');
var expect = require('chai').expect;
var walkSync = require('walk-sync');
var glob = require('glob');
var Blueprint = require('@angular/cli/ember-cli/lib/models/blueprint');
var path = require('path');
var tmp = require('../helpers/tmp');
var root = path.join(__dirname, '../../packages/@angular/cli');
var util = require('util');
var minimatch = require('minimatch');
var intersect = require('lodash/intersection');
var remove = require('lodash/remove');
var unique = require('lodash/uniq');
var forEach = require('lodash/forEach');
var any = require('lodash/some');
var EOL = require('os').EOL;
var existsSync = require('exists-sync');

var defaultIgnoredFiles = Blueprint.ignoredFiles;

describe('Acceptance: ng update', function () {
  this.timeout(20000);

  beforeEach(function () {
    // Make a copy of defaultIgnoredFiles.
    Blueprint.ignoredFiles = defaultIgnoredFiles.splice(0);

    return tmp.setup('./tmp').then(function () {
      process.chdir('./tmp');
    });
  });

  afterEach(function () {
    return tmp.teardown('./tmp');
  });

  function confirmBlueprinted(routing) {
    routing = !!routing;
    var blueprintPath = path.join(root,  'blueprints', 'ng2', 'files');
    var expected = unique(walkSync(blueprintPath).sort());
    var actual = walkSync('.').sort();

    forEach(Blueprint.renamedFiles, function (destFile, srcFile) {
      expected[expected.indexOf(srcFile)] = destFile;
    });

    expected.forEach(function (file, index) {
      expected[index] = file.replace(/__name__/g, 'app');
      expected[index] = expected[index].replace(/__styleext__/g, 'css');
      expected[index] = expected[index].replace(/__path__/g, 'src');
    });

    if (!routing) {
      expected = expected.filter(p => p.indexOf('app-routing.module.ts') < 0);
    }

    removeIgnored(expected);
    removeIgnored(actual);

    expected.sort();

    expect(expected).to.deep.equal(
      actual,
      EOL + ' expected: ' + util.inspect(expected) + EOL + ' but got: ' + util.inspect(actual));
  }

  function confirmGlobBlueprinted(pattern) {
    var blueprintPath = path.join(root, 'blueprints', 'ng2', 'files');
    var actual = pickSync('.', pattern);
    var expected = intersect(pickSync(blueprintPath, pattern), actual);

    removeIgnored(expected);
    removeIgnored(actual);

    expected.sort();

    expect(expected).to.deep.equal(
      actual,
      EOL + ' expected: ' + util.inspect(expected) + EOL + ' but got: ' + util.inspect(actual));
  }

  function pickSync(filePath, pattern) {
    return glob.sync(path.join('**', pattern), { cwd: filePath, dot: true, mark: true, strict: true })
      .sort();
  }

  function removeIgnored(array) {
    remove(array, function (fn) {
      return any(Blueprint.ignoredFiles, function (ignoredFile) {
        return minimatch(fn, ignoredFile, { matchBase: true });
      });
    });
  }

  it('ng init does the same as ng update', function () {
    return ng([
      'init',
      '--skip-npm'
    ]).then(confirmBlueprinted);
  });

  it('ng update can run in created folder', function () {
    return tmp.setup('./tmp/foo')
      .then(function () {
        process.chdir('./tmp/foo');
      })
      .then(function () {
        return ng([
          'init',
          '--skip-npm',
          '--name',
          'tmp'
        ]);
      })
      .then(confirmBlueprinted)
      .then(function () {
        return tmp.teardown('./tmp/foo');
      });
  });

  it('init an already init\'d folder', function () {
    return ng(['init', '--skip-npm'])
      .then(function () {
        return ng(['init', '--skip-npm']);
      })
      .then(confirmBlueprinted);
  });

  it('init a single file', function () {
    return ng(['init', 'package.json', '--skip-npm'])
      .then(function () {
        return 'package.json';
      })
      .then(confirmGlobBlueprinted);
  });

  it('init a single file on already init\'d folder', function () {
    return ng(['init', '--skip-npm'])
      .then(function () {
        return ng(['init', 'package.json', '--skip-npm']);
      })
      .then(confirmBlueprinted);
  });

  it('init multiple files by glob pattern', function () {
    return ng(['init', 'src/**', '--skip-npm'])
      .then(function () {
        return 'src/**';
      })
      .then(confirmGlobBlueprinted);
  });

  it('init multiple files by glob pattern on already init\'d folder', function () {
    return ng(['init', '--skip-npm'])
      .then(function () {
        return ng(['init', 'src/**', '--skip-npm']);
      })
      .then(confirmBlueprinted);
  });

  it('init multiple files by glob patterns', function () {
    return ng(['init', 'src/**', 'package.json', '--skip-npm'])
      .then(function () {
        return '{src/**,package.json}';
      })
      .then(confirmGlobBlueprinted);
  });

  it('init multiple files by glob patterns on already init\'d folder', function () {
    return ng(['init', '--skip-npm'])
      .then(function () {
        return ng(['init', 'src/**', 'package.json', '--skip-npm']);
      })
      .then(confirmBlueprinted);
  });

  it('ng update --inline-template does not generate a template file', () => {
    return ng(['init', '--skip-npm', '--skip-git', '--inline-template'])
      .then(() => {
        const templateFile = path.join('src', 'app', 'app.component.html');
        expect(existsSync(templateFile)).to.equal(false);
      });
  });

  it('ng update --inline-style does not gener a style file', () => {
    return ng(['init', '--skip-npm', '--skip-git', '--inline-style'])
      .then(() => {
        const styleFile = path.join('src', 'app', 'app.component.css');
        expect(existsSync(styleFile)).to.equal(false);
      });
  });

  it('should skip spec files when passed --skip-tests', () => {
    return ng(['init', '--skip-npm', '--skip-git', '--skip-tests'])
      .then(() => {
        const specFile = path.join('src', 'app', 'app.component.spec.ts');
        expect(existsSync(specFile)).to.equal(false);
      });
  });

});
