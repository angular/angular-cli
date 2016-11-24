'use strict';

const ng = require('../helpers/ng');
const tmp = require('../helpers/tmp');

const existsSync = require('exists-sync');
const expect = require('chai').expect;
const path = require('path');
const root = process.cwd();

const testPath = path.join(root, 'tmp', 'foo', 'src', 'app');

describe('Acceptance: ung generate class', function () {
  beforeEach(function () {
    this.timeout(10000);
    return tmp.setup('./tmp').then(function () {
      process.chdir('./tmp');
    }).then(function () {
      return ng(['new', 'foo', '--skip-npm', '--skip-bower']);
    });
  });

  afterEach(function () {
    return tmp.teardown('./tmp');
  });

  it('ung generate class my-class', function () {
    return ng(['generate', 'class', 'my-class']).then(() => {
      expect(existsSync(path.join(testPath, 'my-class.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'my-class.spec.ts'))).to.equal(false);
    });
  });

  it('ung generate class my-class --no-spec', function () {
    return ng(['generate', 'class', 'my-class', '--no-spec']).then(() => {
      expect(existsSync(path.join(testPath, 'my-class.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'my-class.spec.ts'))).to.equal(false);
    });
  });

  it('ung generate class my-class.model', function () {
    return ng(['generate', 'class', 'my-class.model']).then(() => {
      expect(existsSync(path.join(testPath, 'my-class.model.ts'))).to.equal(true);
    });
  });
});
