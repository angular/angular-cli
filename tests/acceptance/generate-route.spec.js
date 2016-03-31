'use strict';

var fs = require('fs-extra');
var ng = require('../helpers/ng');
var existsSync = require('exists-sync');
var expect = require('chai').expect;
var path = require('path');
var tmp = require('../helpers/tmp');
var root = process.cwd();
var conf = require('ember-cli/tests/helpers/conf');
var testPath = path.join(root, 'tmp', 'foo', 'src', 'client', 'app', 'my-route');
var appPath = path.join(root, 'tmp', 'foo', 'src', 'client', 'app');
var routeRegex = /name: 'MyRouteRoot'/g;
var route = {
  routePath: '/my-route/...',
  component: 'MyRouteRoot',
  componentPath: './my-route/my-route-root.component'
};

var fileExpectations = function (expectation) {
  expect(existsSync(path.join(testPath, 'my-route.service.spec.ts'))).to.equal(expectation);
  expect(existsSync(path.join(testPath, 'my-route.service.ts'))).to.equal(expectation);
  expect(existsSync(path.join(testPath, 'my-route-list.component.ts'))).to.equal(expectation);
  expect(existsSync(path.join(testPath, 'my-route-list.component.spec.ts'))).to.equal(expectation);
  expect(existsSync(path.join(testPath, 'my-route-list.component.html'))).to.equal(expectation);
  expect(existsSync(path.join(testPath, 'my-route-list.component.css'))).to.equal(expectation);
  expect(existsSync(path.join(testPath, 'my-route-detail.component.ts'))).to.equal(expectation);
  expect(existsSync(path.join(testPath, 'my-route-detail.component.spec.ts')))
    .to.equal(expectation);
  expect(existsSync(path.join(testPath, 'my-route-detail.component.html'))).to.equal(expectation);
  expect(existsSync(path.join(testPath, 'my-route-detail.component.css'))).to.equal(expectation);
  expect(existsSync(path.join(testPath, 'my-route-root.component.ts'))).to.equal(expectation);
};

describe('Acceptance: ng generate route', function () {
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

  it('ng generate route my-route', function () {
    return ng(['generate', 'route', 'my-route']).then(() => {
      var ngCliConfig =
        JSON.parse(fs.readFileSync(path.join(root, 'tmp', 'foo', 'angular-cli.json'), 'utf-8'));
      var routeConfigString =
        fs.readFileSync(path.join(appPath, 'route-config.ts'), 'utf-8').toString();
      expect(routeConfigString.match(routeRegex).length).to.equal(1);

      fileExpectations(true);
      
      expect(ngCliConfig.routes[0]).to.deep.equal(route);
    });
  });
  it('ng generate route my-route with skip-router-generation flag does not generate router config',
    function () {
      return ng(['generate', 'route', 'my-route', '--skip-router-generation']).then(() => {
        var ngCliConfig = JSON.parse(
          fs.readFileSync(path.join(root, 'tmp', 'foo', 'angular-cli.json'), 'utf-8'));

        fileExpectations(true);

        expect(ngCliConfig.routes.length).to.equal(0);
      });
    });
  it('ng generate route my-route then destroy', function () {
    return ng(['generate', 'route', 'my-route'])
      .then(() => {
        var ngCliConfig = JSON.parse(
          fs.readFileSync(path.join(root, 'tmp', 'foo', 'angular-cli.json'), 'utf-8'));
        var routeConfigString =
          fs.readFileSync(path.join(appPath, 'route-config.ts'), 'utf-8').toString();
        expect(routeConfigString.match(routeRegex).length).to.equal(1);

        fileExpectations(true);

        expect(ngCliConfig.routes.length).to.equal(1);
        expect(ngCliConfig.routes[0]).to.deep.equal(route);
      })
      .then(() => {
        return ng(['destroy', 'route', 'my-route']).then(() => {
          var ngCliConfig = JSON.parse(
            fs.readFileSync(path.join(root, 'tmp', 'foo', 'angular-cli.json'), 'utf-8'));
          var routeConfigString =
            fs.readFileSync(path.join(appPath, 'route-config.ts'), 'utf-8').toString();
          expect(routeConfigString.match(routeRegex)).to.equal(null);

          fileExpectations(false);

          expect(ngCliConfig.routes.length).to.equal(0);
        })
      });
  });
});
