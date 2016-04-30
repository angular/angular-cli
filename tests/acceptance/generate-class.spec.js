'use strict';

const ng = require('../helpers/ng');
const tmp = require('../helpers/tmp');

const conf = require('ember-cli/tests/helpers/conf');
const existsSync = require('exists-sync');
const expect = require('chai').expect;
const path = require('path');
const root = process.cwd();

const testPath = path.join(root, 'tmp', 'foo', 'src', 'app');

describe('Acceptance: ng generate class', function () {
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

  it('ng generate class my-class', function () {
    return ng(['generate', 'class', 'my-class']).then(() => {
      expect(existsSync(path.join(testPath, 'my-class.ts'))).to.equal(true);
    });
  });
  
  it('ng generate class my-class model', function () {
    return ng(['generate', 'class', 'my-class', 'model']).then(() => {
      expect(existsSync(path.join(testPath, 'my-class.model.ts'))).to.equal(true);
    });
  });

  it(`ng generate class shared${path.sep}my-class`, function () {
    return ng(['generate', 'class', 'shared/my-class']).then(() => {
      expect(existsSync(path.join(testPath, 'shared', 'my-class.ts'))).to.equal(true);
    });
  });
  
  it(`ng generate class shared${path.sep}my-class model`, function () {
    return ng(['generate', 'class', 'shared/my-class', 'model']).then(() => {
      expect(existsSync(path.join(testPath, 'shared', 'my-class.model.ts'))).to.equal(true);
    });
  });
});
