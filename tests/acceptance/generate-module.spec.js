'use strict';

const ng = require('../helpers/ng');
const tmp = require('../helpers/tmp');

const conf = require('ember-cli/tests/helpers/conf');
const existsSync = require('exists-sync');
const expect = require('chai').expect;
const path = require('path');
const root = process.cwd();

const testPath = path.join(root, 'tmp', 'foo', 'src', 'app');

describe('Acceptance: ng generate module', function () {
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

  it('ng generate module my-module', function () {
    return ng(['generate', 'module', 'my-module']).then(() => {
      expect(existsSync(path.join(testPath, 'my-module', 'my-module.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'my-module', 'my-module.module.spec.ts'))).to.equal(false);
    });
  });

  it('ng generate module my-module --spec', function () {
    return ng(['generate', 'module', 'my-module', '--spec']).then(() => {
      expect(existsSync(path.join(testPath, 'my-module', 'my-module.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'my-module', 'my-module.module.spec.ts'))).to.equal(true);
    });
  });

  it(`ng generate module shared${path.sep}my-module`, function () {
    return ng(['generate', 'module', 'shared/my-module']).then(() => {
      expect(existsSync(path.join(testPath, 'shared', 'my-module', 'my-module.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'shared', 'my-module', 'my-module.module.spec.ts'))).to.equal(false);
    });
  });

  it(`ng generate module shared${path.sep}my-module --spec`, function () {
    return ng(['generate', 'module', 'shared/my-module', '--spec']).then(() => {
      expect(existsSync(path.join(testPath, 'shared', 'my-module', 'my-module.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'shared', 'my-module', 'my-module.module.spec.ts'))).to.equal(true);
    });
  });
});
