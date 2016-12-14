'use strict';

const ng = require('../helpers/ng');
const tmp = require('../helpers/tmp');

const existsSync = require('exists-sync');
const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');
const root = process.cwd();

const testPath = path.join(root, 'tmp', 'foo', 'src', 'app');

const denodeify = require('denodeify');
const readFile = denodeify(fs.readFile);

function fileExpectations(expectation) {
  const dir = 'route-test';
  expect(existsSync(path.join(testPath, dir, 'route-test.component.ts'))).to.equal(expectation);
}

xdescribe('Acceptance: ng generate route', function () {
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

  it('ng generate route route-test', function () {
    return ng(['generate', 'route', 'route-test']).then(() => {
      fileExpectations(true, true);
    });
  });

  it('ng generate route +route-test', function () {
    return ng(['generate', 'route', '+route-test']).then(() => {
      fileExpectations(true, true);
    });
  });

  it('ng generate route +route-test/other-test', () => {
    return ng(['generate', 'route', '+route-test'])
      .then(() => ng(['generate', 'route', '+route-test/other-test', '--default']))
      .then(() => ng(['generate', 'route', '+route-test/+other-test/third-test', '--default']))
      .then(() => {
        expect(existsSync(path.join(testPath, '+route-test/route-test.component.ts')))
          .to.equal(true);
        expect(existsSync(path.join(testPath, '+route-test/+other-test/other-test.component.ts')))
          .to.equal(true);
        expect(existsSync(path.join(testPath, '+route-test/+other-test/+third-test/third-test.component.ts')))
          .to.equal(true);

        const appContent = fs.readFileSync(path.join(testPath, 'foo.component.ts'), 'utf-8');
        const myRouteContent = fs.readFileSync(path.join(testPath, '+route-test/route-test.component.ts'), 'utf-8');
        const myOtherRouteContent = fs.readFileSync(path.join(testPath, '+route-test/+other-test/other-test.component.ts'), 'utf-8');
        const myThirdRouteContent = fs.readFileSync(path.join(testPath, '+route-test/+other-test/+third-test/third-test.component.ts'), 'utf-8');

        expect(appContent).to.match(/@Routes\(\[[\s\S]+\/\+route-test\/\.\.\.[\s\S]+\]\)/m);
        expect(myRouteContent).to.match(/@Routes\(\[[\s\S]+\/other-test\/\.\.\.[\s\S]+\]\)/m);
        expect(myOtherRouteContent).to.match(/@Routes\(\[[\s\S]+\/third-test[^\.][\s\S]+\]\)/m);
        expect(myThirdRouteContent).to.not.include('@Routes');
      });
  });

  it('ng generate route details --path /details/:id', () => {
    return ng(['generate', 'route', 'details', '--path', '/details/:id'])
      .then(() => {
        const appContent = fs.readFileSync(path.join(testPath, 'foo.component.ts'), 'utf-8');
        expect(appContent).to.match(/path: '\/details\/:id'/m);
      });
  });

  it('ng generate route route-test --dry-run does not modify files', () => {
    var parentComponentPath = path.join(testPath, 'foo.component.ts');
    var parentComponentHtmlPath = path.join(testPath, 'foo.component.html')

    var unmodifiedParentComponent = fs.readFileSync(parentComponentPath, 'utf8');
    var unmodifiedParentComponentHtml = fs.readFileSync(parentComponentHtmlPath, 'utf8');

    return ng(['generate', 'route', 'route-test', '--dry-run']).then(() => {
      var afterGenerateParentComponent = fs.readFileSync(parentComponentPath, 'utf8');
      var afterGenerateParentHtml = fs.readFileSync(parentComponentHtmlPath, 'utf8');

      expect(afterGenerateParentComponent).to.equal(unmodifiedParentComponent);
      expect(afterGenerateParentHtml).to.equal(unmodifiedParentComponentHtml);
    });
  });

  it('a-test-route should generate file a-test.route', function(){
    return ng(['generate', 'route', 'a-test-route']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'a-test.route.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('ATestRoute should generate file atest.route', function(){
    return ng(['generate', 'route', 'ATestRoute']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'atest.route.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('atestroute should generate file atest.route', function(){
    return ng(['generate', 'route', 'atestroute']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'atest.route.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('a-test-component should should ignore suffix removal', function(){
    return ng(['generate', 'route', 'a-test-component']).then(() => {
      var testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'a-test-component.route.ts');
      expect(existsSync(testPath)).to.equal(true);
    });
  });

  it('name a-test-route generates ATestRoute route name not ATestRouteRoute', function () {
    let testPath = path.join(root, 'tmp', 'foo', 'src', 'app', 'a-test.route.ts');
    return ng(['generate', 'route', 'a-test-route'])
      .then(() => {
        expect(existsSync(testPath)).to.equal(true);
      })
      .then(() => readFile(testPath, 'utf-8'))
      .then(content => {
        expect(content).to.matches(/^export\sclass\s(ATestRoute)/m);
      });
  });

});
