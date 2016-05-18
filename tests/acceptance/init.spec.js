'use strict';

var ng = require('../helpers/ng');
var expect = require('chai').expect;
var walkSync = require('walk-sync');
var glob = require('glob');
var Blueprint = require('ember-cli/lib/models/blueprint');
var path = require('path');
var tmp = require('../helpers/tmp');
var root = process.cwd();
var util = require('util');
var conf = require('ember-cli/tests/helpers/conf');
var minimatch = require('minimatch');
var intersect = require('lodash/intersection');
var remove = require('lodash/remove');
var unique = require('lodash/uniq');
var forEach = require('lodash/forEach');
var any = require('lodash/some');
var EOL = require('os').EOL;

var defaultIgnoredFiles = Blueprint.ignoredFiles;

describe('Acceptance: ng init', function () {
  this.timeout(20000);

  before(function () {
    conf.setup();
  });

  after(function () {
    conf.restore();
  });

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

  function confirmBlueprinted(isMobile) {
    var blueprintPath = path.join(root, 'addon', 'ng2', 'blueprints', 'ng2', 'files');
    var mobileBlueprintPath = path.join(root, 'addon', 'ng2', 'blueprints', 'mobile', 'files');
    var expected = unique(walkSync(blueprintPath).concat(isMobile ? walkSync(mobileBlueprintPath) : []).sort());
    var actual = walkSync('.').sort();

    forEach(Blueprint.renamedFiles, function (destFile, srcFile) {
      expected[expected.indexOf(srcFile)] = destFile;
    });

    expected.forEach(function (file, index) {
      expected[index] = file.replace(/__name__/g, 'tmp');
      expected[index] = expected[index].replace(/__styleext__/g, 'css');
      expected[index] = expected[index].replace(/__path__/g, 'src');
    });
    
    if (isMobile) {
      expected = expected.filter(p => p.indexOf('tmp.component.html') < 0);
      expected = expected.filter(p => p.indexOf('tmp.component.css') < 0);
    }

    removeIgnored(expected);
    removeIgnored(actual);

    expected.sort();

    expect(expected).to.deep.equal(
      actual,
      EOL + ' expected: ' + util.inspect(expected) + EOL + ' but got: ' + util.inspect(actual));
  }

  function confirmGlobBlueprinted(pattern) {
    var blueprintPath = path.join(root, 'addon', 'ng2', 'blueprints', 'ng2', 'files');
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

  it('ng init', function () {
    return ng([
      'init',
      '--skip-npm',
      '--skip-bower'
    ]).then(confirmBlueprinted);
  });

  it('ng init --mobile', () => {
    return ng([
      'init',
      '--skip-npm',
      '--skip-bower',
      '--mobile'
    ]).then(() => confirmBlueprinted(true));
  });

  it('ng init can run in created folder', function () {
    return tmp.setup('./tmp/foo')
      .then(function () {
        process.chdir('./tmp/foo');
      })
      .then(function () {
        return ng([
          'init',
          '--skip-npm',
          '--skip-bower',
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
    return ng(['init', '--skip-npm', '--skip-bower'])
      .then(function () {
        // ignore the favicon file for the the unit test since it breaks at ember-cli level
        // when trying to re-init
        Blueprint.ignoredFiles.push('favicon.ico');
      })
      .then(function () {
        return ng(['init', '--skip-npm', '--skip-bower']);
      })
      .then(confirmBlueprinted);
  });

  it('init a single file', function () {
    return ng(['init', 'package.json', '--skip-npm', '--skip-bower'])
      .then(function () {
        return 'package.json';
      })
      .then(confirmGlobBlueprinted);
  });

  it('init a single file on already init\'d folder', function () {
    return ng(['init', '--skip-npm', '--skip-bower'])
      .then(function () {
        return ng(['init', 'package.json', '--skip-npm', '--skip-bower']);
      })
      .then(confirmBlueprinted);
  });

  it('init multiple files by glob pattern', function () {
    return ng(['init', 'src/**', '--skip-npm', '--skip-bower'])
      .then(function () {
        return 'src/**';
      })
      .then(confirmGlobBlueprinted);
  });

  it('init multiple files by glob pattern on already init\'d folder', function () {
    return ng(['init', '--skip-npm', '--skip-bower'])
      .then(function () {
        return ng(['init', 'src/**', '--skip-npm', '--skip-bower']);
      })
      .then(confirmBlueprinted);
  });

  it('init multiple files by glob patterns', function () {
    return ng(['init', 'src/**', 'package.json', '--skip-npm', '--skip-bower'])
      .then(function () {
        return '{src/**,package.json}';
      })
      .then(confirmGlobBlueprinted);
  });

  it('init multiple files by glob patterns on already init\'d folder', function () {
    return ng(['init', '--skip-npm', '--skip-bower'])
      .then(function () {
        return ng(['init', 'src/**', 'package.json', '--skip-npm', '--skip-bower']);
      })
      .then(confirmBlueprinted);
  });
});
