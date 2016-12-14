'use strict';

const ng = require('../helpers/ng');
const tmp = require('../helpers/tmp');

const existsSync = require('exists-sync');
const expect = require('chai').expect;
const path = require('path');
const root = process.cwd();

const testPath = path.join(root, 'tmp', 'foo', 'src', 'app');

var fs = require('fs-extra');
const denodeify = require('denodeify');
const readFile = denodeify(fs.readFile);

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

  it('ng generate module module-test', function () {
    return ng(['generate', 'module', 'module-test']).then(() => {
      expect(existsSync(path.join(testPath, 'module-test', 'module-test.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'module-test', 'module-test.module.spec.ts'))).to.equal(false);
      expect(existsSync(path.join(testPath, 'module-test', 'module-test.component.ts'))).to.equal(false);
    });
  });

  it('ng generate module  generate routing and component files when passed flag --routing', function () {
    return ng(['generate', 'module', 'module-test', '--routing']).then( () => {
      expect(existsSync(path.join(testPath, 'module-test', 'module-test.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'module-test', 'module-test-routing.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'module-test', 'module-test.module.spec.ts'))).to.equal(false);
      expect(existsSync(path.join(testPath, 'module-test', 'module-test.component.ts'))).to.equal(true);
    })
  });

  it('ng generate module module-test --spec', function () {
    return ng(['generate', 'module', 'module-test', '--spec']).then(() => {
      expect(existsSync(path.join(testPath, 'module-test', 'module-test.module.ts'))).to.equal(true);
      expect(existsSync(path.join(testPath, 'module-test', 'module-test.module.spec.ts'))).to.equal(true);
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

  it('a-test-module should generate file a-test.module', function(){
    return ng(['generate', 'module', 'a-test-module']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'a-test', 'a-test.module.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ATestModule should generate file atest.module', function(){
    return ng(['generate', 'module', 'ATestModule']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'atest', 'atest.module.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('atestmodule should generate file atest.module', function(){
    return ng(['generate', 'module', 'atestmodule']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'atest', 'atest.module.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('a-test-component should should ignore suffix removal', function(){
    return ng(['generate', 'module', 'a-test-component']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'a-test-component', 'a-test-component.module.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('name a-test-module generates ATestModule module name not ATestModuleModule', function () {
    let testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'a-test', 'a-test.module.ts');
    return ng(['generate', 'module', 'a-test-module'])
      .then(() => {
        expect(existsSync(testPath)).to.equal(true);
      })
      .then(() => readFile(testPath, 'utf-8'))
      .then(content => {
        expect(content).to.matches(/^export\sclass\s(ATestModule)/m);
      });
  });

});
