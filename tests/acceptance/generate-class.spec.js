'use strict';

const ng = require('../helpers/ng');
const tmp = require('../helpers/tmp');

const existsSync = require('exists-sync');
const expect = require('chai').expect;
const path = require('path');
const root = process.cwd();

const testPath = path.join(root, 'tmp', 'foo', 'src', 'app');

describe('Acceptance: ng generate class', function () {
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

  it('ng generate class class-test', function () {
    return ng(['generate', 'class', 'class-test']).then(() => {
      expect(existsSync(path.join(testPath, 'class-test.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'class-test.spec.ts'))).to.equal(false);
    });
  });

  it('ng generate class class-test --no-spec', function () {
    return ng(['generate', 'class', 'class-test', '--no-spec']).then(() => {
      expect(existsSync(path.join(testPath, 'class-test.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'class-test.spec.ts'))).to.equal(false);
    });
  });

  it('ng generate class class-test.model', function () {
    return ng(['generate', 'class', 'class-test.model']).then(() => {
      expect(existsSync(path.join(testPath, 'class-test.model.ts'))).to.equal(true);
    });
  });
});
