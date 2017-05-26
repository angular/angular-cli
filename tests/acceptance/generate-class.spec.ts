import * as fs from 'fs-extra';
import { expect } from 'chai';
import * as path from 'path';

const ng = require('../helpers/ng');
const tmp = require('../helpers/tmp');

const root = process.cwd();

const testPath = path.join(root, 'tmp', 'foo', 'src', 'app');

describe('Acceptance: ng generate class', function () {
  beforeEach(function () {
    this.timeout(10000);
    return tmp.setup('./tmp').then(function () {
      process.chdir('./tmp');
    }).then(function () {
      return ng(['new', 'foo', '--skip-install']);
    });
  });

  afterEach(function () {
    return tmp.teardown('./tmp');
  });

  it('ng generate class my-class', function () {
    return ng(['generate', 'class', 'my-class']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'my-class.ts'))).to.equal(true);
      expect(fs.pathExistsSync(path.join(testPath, 'my-class.spec.ts'))).to.equal(false);
    });
  });

  it('ng generate class my-class --no-spec', function () {
    return ng(['generate', 'class', 'my-class', '--no-spec']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'my-class.ts'))).to.equal(true);
      expect(fs.pathExistsSync(path.join(testPath, 'my-class.spec.ts'))).to.equal(false);
    });
  });

  it('ng generate class my-class.model', function () {
    return ng(['generate', 'class', 'my-class.model']).then(() => {
      expect(fs.pathExistsSync(path.join(testPath, 'my-class.model.ts'))).to.equal(true);
    });
  });
});
