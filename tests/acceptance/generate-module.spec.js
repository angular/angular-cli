'use strict';

const ng = require('../helpers/ng');
const tmp = require('../helpers/tmp');

const existsSync = require('exists-sync');
const expect = require('chai').expect;
const path = require('path');
const root = process.cwd();

const testPath = path.join(root, 'tmp', 'foo', 'src', 'app');

describe('Acceptance: ung generate module', function () {
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
      expect(error).to.equal('The `ung generate module` command requires a name to be specified.');
    });
  });

  it('ung generate module my-module', function () {
    return ng(['generate', 'module', 'my-module']).then(() => {
      expect(existsSync(path.join(testPath, 'my-module', 'my-module.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'my-module', 'my-module.module.spec.ts'))).to.equal(false);
      expect(existsSync(path.join(testPath, 'my-module', 'my-module.component.ts'))).to.equal(false);
    });
  });

  it('ung generate module  generate routing and component files when passed flag --routing', function () {
    return ng(['generate', 'module', 'my-module', '--routing']).then( () => {
      expect(existsSync(path.join(testPath, 'my-module', 'my-module.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'my-module', 'my-module-routing.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'my-module', 'my-module.module.spec.ts'))).to.equal(false);
      expect(existsSync(path.join(testPath, 'my-module', 'my-module.component.ts'))).to.equal(true);
    })
  });

  it('ung generate module my-module --spec', function () {
    return ng(['generate', 'module', 'my-module', '--spec']).then(() => {
      expect(existsSync(path.join(testPath, 'my-module', 'my-module.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'my-module', 'my-module.module.spec.ts'))).to.equal(true);
    });
  });

  it('ung generate module TwoWord', function () {
    return ng(['generate', 'module', 'TwoWord']).then(() => {
      expect(existsSync(path.join(testPath, 'two-word', 'two-word.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'two-word', 'two-word.module.spec.ts'))).to.equal(false);
    });
  });

  it('ung generate module parent/child', function () {
    return ng(['generate', 'module', 'parent']).then(() =>
      ng(['generate', 'module', 'parent/child']).then(() => {
        expect(existsSync(path.join(testPath, 'parent/child', 'child.module.ts'))).to.equal(true);
        expect(existsSync(path.join(testPath, 'parent/child', 'child.module.spec.ts'))).to.equal(false);
        expect(existsSync(path.join(testPath, 'parent/child', 'child.component.ts'))).to.equal(false);
      })
    );
  });

  it('ng generate module should generate parent/child module with routing and component files when passed --routing flag', function () {
    return ng(['generate', 'module', 'parent']).then(() =>
      ng(['generate', 'module', 'parent/child', '--routing']).then(() => {
        expect(existsSync(path.join(testPath, 'parent/child', 'child.module.ts'))).to.equal(true);
        expect(existsSync(path.join(testPath, 'parent/child', 'child-routing.module.ts'))).to.equal(true);
        expect(existsSync(path.join(testPath, 'parent/child', 'child.module.spec.ts'))).to.equal(false);
        expect(existsSync(path.join(testPath, 'parent/child', 'child.component.ts'))).to.equal(true);
      })
    );
  });
});
