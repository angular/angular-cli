'use strict';

var ng = require('../helpers/ng');
var existsSync = require('exists-sync');
var expect = require('chai').expect;
var path = require('path');
var tmp = require('../helpers/tmp');
var root = process.cwd();
var conf = require('ember-cli/tests/helpers/conf');
var testPath = path.join(root, 'tmp', 'foo', 'src', 'client', 'app');

var fileExpectations = function (lazy, expectation) {
  var lazyPrefix = lazy ? '+' : '';
  var dir = `${lazyPrefix}my-route`;
  expect(existsSync(path.join(testPath, dir, 'my-route.component.ts'))).to.equal(expectation);
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
      fileExpectations(true, true);
    });
  });

  it('ng generate route my-route --lazy false', function () {
    return ng(['generate', 'route', 'my-route', '--lazy', 'false']).then(() => {
      fileExpectations(false, true);
    });
  });
});
