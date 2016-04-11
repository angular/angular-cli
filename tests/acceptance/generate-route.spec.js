'use strict';

var ng = require('../helpers/ng');
var sh = require('shelljs');
var existsSync = require('exists-sync');
var expect = require('chai').expect;
var path = require('path');
var tmp = require('../helpers/tmp');
var root = process.cwd();
var conf = require('ember-cli/tests/helpers/conf');
var testPath = path.join(root, 'tmp', 'foo', 'src', 'client', 'app', 'my-route');

var fileExpectations = function (expectation) {
  expect(existsSync(path.join(testPath, 'my-route.ts'))).to.equal(expectation);
};

describe('Acceptance: ng generate route', function () {
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

  it('ng generate route my-route', function () {
    return ng(['generate', 'route', 'my-route']).then(() => {
      fileExpectations(true);
    });
  });
  it('ng generate route my-route with skip-router-generation flag does not generate router config',
    function () {
      return ng(['generate', 'route', 'my-route', '--skip-router-generation']).then(() => {
        fileExpectations(true);
      });
    });
  it('ng generate route my-route then destroy', function () {
    return ng(['generate', 'route', 'my-route'])
      .then(() => fileExpectations(true))
      .then(() => ng(['destroy', 'route', 'my-route']))
      .then(() => {
        fileExpectations(false);

        // Expect everything to be the same as before.
        expect(sh.exec('git status --porcelain').output).to.be.equal('');
      });
  });
});
