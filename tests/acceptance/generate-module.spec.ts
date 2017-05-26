// tslint:disable:max-line-length
import * as fs from 'fs-extra';
import { expect } from 'chai';
import * as path from 'path';

const ng = require('../helpers/ng');
const tmp = require('../helpers/tmp');

const root = process.cwd();

const testPath = path.join(root, 'tmp', 'foo', 'src', 'app');

describe('Acceptance: ng generate module', function () {
  beforeEach(function () {
    return tmp.setup('./tmp').then(function () {
      process.chdir('./tmp');
    }).then(function () {
      return ng(['new', 'foo', '--skip-install']);
    });
  });

  afterEach(function () {
    this.timeout(10000);

    return tmp.teardown('./tmp');
  });

  it('will fail if no name is specified', function () {
    return ng(['generate', 'module']).catch((error: string) => {
      expect(error).to.equal('The `ng generate module` command requires a name to be specified.');
    });
  });

  it('ng generate module my-module', function () {
    return ng(['generate', 'module', 'my-module']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module.module.ts'))).to.equal(true);
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module.module.spec.ts'))).to.equal(false);
    });
  });

  it('ng generate module  generate routing file when passed flag --routing', function () {
    return ng(['generate', 'module', 'my-module', '--routing']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module.module.ts'))).to.equal(true);
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module-routing.module.ts'))).to.equal(true);
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module.module.spec.ts'))).to.equal(false);
    });
  });

  it('ng generate module my-module --spec', function () {
    return ng(['generate', 'module', 'my-module', '--spec']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module.module.ts'))).to.equal(true);
      expect(fs.pathExistsSync(path.join(testPath, 'my-module', 'my-module.module.spec.ts'))).to.equal(true);
    });
  });

  it('ng generate module TwoWord', function () {
    return ng(['generate', 'module', 'TwoWord']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'two-word', 'two-word.module.ts'))).to.equal(true);
      expect(fs.pathExistsSync(path.join(testPath, 'two-word', 'two-word.module.spec.ts'))).to.equal(false);
    });
  });

  it('ng generate module parent/child', function () {
    return ng(['generate', 'module', 'parent']).then(() =>
      ng(['generate', 'module', 'parent/child']).then(() => {
        expect(fs.pathExistsSync(path.join(testPath, 'parent/child', 'child.module.ts'))).to.equal(true);
        expect(fs.pathExistsSync(path.join(testPath, 'parent/child', 'child.module.spec.ts'))).to.equal(false);
      })
    );
  });

  it('ng generate module child should work in sub-dir', function () {
    fs.mkdirSync(path.join(testPath, './sub-dir'));
    return new Promise(resolve => {
      process.chdir(path.join(testPath, './sub-dir'));
      return resolve();
    }).then(() =>
      ng(['generate', 'module', 'child']).then(() => {
        expect(fs.pathExistsSync(path.join(testPath, 'sub-dir/child', 'child.module.ts'))).to.equal(true);
        expect(fs.pathExistsSync(path.join(testPath, 'sub-dir/child', 'child.module.spec.ts'))).to.equal(false);
      })
    );
  });

  // tslint:disable-next-line:max-line-length
  it('ng generate module child should work in sub-dir with routing file when passed --routing flag', function () {
    fs.mkdirSync(path.join(testPath, './sub-dir'));
    return new Promise(resolve => {
      process.chdir(path.join(testPath, './sub-dir'));
      return resolve();
    }).then(() =>
      ng(['generate', 'module', 'child', '--routing']).then(() => {
        expect(fs.pathExistsSync(path.join(testPath, 'sub-dir/child', 'child.module.ts'))).to.equal(true);
        expect(fs.pathExistsSync(path.join(testPath, 'sub-dir/child', 'child-routing.module.ts'))).to.equal(true);
        expect(fs.pathExistsSync(path.join(testPath, 'sub-dir/child', 'child.module.spec.ts'))).to.equal(false);
      })
    );
  });

  // tslint:disable-next-line:max-line-length
  it('ng generate module should generate parent/child module with routing file when passed --routing flag', function () {
    return ng(['generate', 'module', 'parent']).then(() =>
      ng(['generate', 'module', 'parent/child', '--routing']).then(() => {
        expect(fs.pathExistsSync(path.join(testPath, 'parent/child', 'child.module.ts'))).to.equal(true);
        expect(fs.pathExistsSync(path.join(testPath, 'parent/child', 'child-routing.module.ts'))).to.equal(true);
        expect(fs.pathExistsSync(path.join(testPath, 'parent/child', 'child.module.spec.ts'))).to.equal(false);
      })
    );
  });
});
