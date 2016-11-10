'use strict';

const ng = require('../helpers/ng');
const tmp = require('../helpers/tmp');

const existsSync = require('exists-sync');
const expect = require('chai').expect;
const path = require('path');
const root = process.cwd();

const testPath = path.join(root, 'tmp', 'foo', 'src', 'app');

describe('Acceptance: ng generate module', function () {
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

  it('will fail if no name is specified', function () {
    return ng(['generate', 'module']).catch((error) => {
      expect(error).to.equal('The `ng generate module` command requires a name to be specified.');
    });
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

  it('ng generate module TwoWord', function () {
    return ng(['generate', 'module', 'TwoWord']).then(() => {
      expect(existsSync(path.join(testPath, 'two-word', 'two-word.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'two-word', 'two-word.module.spec.ts'))).to.equal(false);
    });
  });

  it('ng generate module parent/child', function () {
    return ng(['generate', 'module', 'parent']).then(() =>
      ng(['generate', 'module', 'parent/child']).then(() => {
        expect(existsSync(path.join(testPath, 'parent/child', 'child.module.ts'))).to.equal(true);
        expect(existsSync(path.join(testPath, 'parent/child', 'child.module.spec.ts'))).to.equal(false);
        expect(existsSync(path.join(testPath, 'parent/child', 'child.component.ts'))).to.equal(true);
      })
    );
  });
});
