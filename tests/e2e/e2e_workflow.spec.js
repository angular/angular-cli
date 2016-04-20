'use strict';

var fs = require('fs');
var path = require('path');
var tmp = require('../helpers/tmp');
var chai = require('chai');
var expect = chai.expect;
var conf = require('ember-cli/tests/helpers/conf');
var sh = require('shelljs');
var ng = require('../helpers/ng');
var root = path.join(process.cwd(), 'tmp');

function existsSync(path) {
  try {
    fs.accessSync(path);
    return true;
  } catch (e) {
    return false;
  }
}

describe('Basic end-to-end Workflow', function () {
  before(conf.setup);

  after(conf.restore);

  var testArgs = ['test', '--watch', 'false'];

  // In travis CI only run tests in Chrome_travis_ci
  if (process.env.TRAVIS) {
    testArgs.push('--browsers');
    testArgs.push('Chrome_travis_ci');
  }

  it('Installs angular-cli correctly', function () {
    this.timeout(300000);

    sh.exec('npm link', { silent: true });
    return tmp.setup('./tmp').then(function () {
      process.chdir('./tmp');
      expect(existsSync(path.join(process.cwd(), 'bin', 'ng')));
    });
  });

  it('Can create new project using `ng new test-project`', function () {
    this.timeout(4200000);

    return ng(['new', 'test-project', '--silent']).then(function () {
      expect(existsSync(path.join(root, 'test-project')));
    });
  });

  it('Can change current working directory to `test-project`', function () {
    this.timeout(420000);
    process.chdir(path.join(root, 'test-project'));
    sh.exec('npm link angular-cli', { silent: true });
    expect(path.basename(process.cwd())).to.equal('test-project');
  });

  it('Supports production builds via `ng build --environment=production`', function() {
    this.timeout(420000);

    // Can't user the `ng` helper because somewhere the environment gets
    // stuck to the first build done
    sh.exec('ng build --environment=production --silent');
    expect(existsSync(path.join(process.cwd(), 'dist'))).to.be.equal(true);
    var envPath = path.join(process.cwd(), 'dist', 'app', 'environment.js');
    var envContent = fs.readFileSync(envPath, { encoding: 'utf8' });
    expect(envContent).to.include('production:true');
    // Also does not create new things in GIT.
    expect(sh.exec('git status --porcelain').output).to.be.equal('');
  });

  it('Can run `ng build` in created project', function () {
    this.timeout(420000);

    return ng(['build', '--silent'])
      .then(function () {
        expect(existsSync(path.join(process.cwd(), 'dist'))).to.be.equal(true);
      })
      .then(function () {
        // Also does not create new things in GIT.
        expect(sh.exec('git status --porcelain').output).to.be.equal('');
      })
      .catch(() => {
        throw new Error('Build failed.');
      });
  });

  it('Produces a service worker manifest after initial build', function () {
    var manifestPath = path.join(process.cwd(), 'dist', 'manifest.appcache');
    expect(existsSync(manifestPath)).to.be.equal(true);
    // Read the worker.
    //TODO: Commenting this out because it makes eslint fail(need to figure out why this expect was commented out)
    // var lines = fse.readFileSync(manifestPath, {encoding: 'utf8'}).trim().split('\n');

    // Check that a few critical files have been detected.
    // expect(lines).to.include(`${path.sep}index.html`);
  });

  it('Perform `ng test` after initial build', function () {
    this.timeout(420000);

    return ng(testArgs).then(function (result) {
      const exitCode = typeof result === 'object' ? result.exitCode : result;
      expect(exitCode).to.be.equal(0);
    });
  });

  it('Can create a test component using `ng generate component test-component`', function () {
    this.timeout(10000);
    return ng(['generate', 'component', 'test-component']).then(function () {
      var componentDir = path.join(process.cwd(), 'src', 'client', 'app', 'components', 'test-component');
      expect(existsSync(componentDir));
      expect(existsSync(path.join(componentDir, 'test-component.ts')));
      expect(existsSync(path.join(componentDir, 'test-component.html')));
      expect(existsSync(path.join(componentDir, 'test-component.css')));
    });
  });

  it('Perform `ng test` after adding a component', function () {
    this.timeout(420000);

    return ng(testArgs).then(function (result) {
      const exitCode = typeof result === 'object' ? result.exitCode : result;
      expect(exitCode).to.be.equal(0);
    });
  });

  it('Can create a test service using `ng generate service test-service`', function () {
    return ng(['generate', 'service', 'test-service']).then(function () {
      var serviceDir = path.join(process.cwd(), 'src', 'client', 'app', 'services', 'test-service');
      expect(existsSync(serviceDir));
      expect(existsSync(path.join(serviceDir, 'test-service.ts')));
      expect(existsSync(path.join(serviceDir, 'test-service.spec.ts')));
    });
  });

  it('Perform `ng test` after adding a service', function () {
    this.timeout(420000);

    return ng(testArgs).then(function (result) {
      const exitCode = typeof result === 'object' ? result.exitCode : result;
      expect(exitCode).to.be.equal(0);
    });
  });

  it('Can create a test pipe using `ng generate pipe test-pipe`', function () {
    return ng(['generate', 'pipe', 'test-pipe']).then(function () {
      var pipeDir = path.join(process.cwd(), 'src', 'client', 'app', 'pipes', 'test-pipe');
      expect(existsSync(pipeDir));
      expect(existsSync(path.join(pipeDir, 'test-pipe.ts')));
      expect(existsSync(path.join(pipeDir, 'test-pipe.spec.ts')));
    });
  });

  it('Perform `ng test` after adding a pipe', function () {
    this.timeout(420000);

    return ng(testArgs).then(function (result) {
      const exitCode = typeof result === 'object' ? result.exitCode : result;
      expect(exitCode).to.be.equal(0);
    });
  });

  it('Can create a test route using `ng generate route test-route`', function () {
    return ng(['generate', 'route', 'test-route']).then(function () {
      var routeDir = path.join(process.cwd(), 'src', 'client', 'app', 'test-route');
      expect(existsSync(routeDir));
      expect(existsSync(path.join(routeDir, 'test-route.ts')));
    });
  });

  it('Perform `ng test` after adding a route', function () {
    this.timeout(420000);

    return ng(testArgs).then(function (result) {
      const exitCode = typeof result === 'object' ? result.exitCode : result;
      expect(exitCode).to.be.equal(0);
    });
  });

  it('moves all files that live inside `public` into `dist`', function () {
    this.timeout(420000);

    const tmpFile = path.join(process.cwd(), 'public', 'test.abc');
    const tmpFileLocation = path.join(process.cwd(), 'dist', 'test.abc');
    fs.writeFileSync(tmpFile, 'hello world');

    return ng(['build', '--silent'])
      .then(function () {
        expect(existsSync(tmpFileLocation));
      })
      .catch(err => {
        throw new Error(err)
      });
  });

  it('Installs sass support successfully', function() {
    this.timeout(420000);

    sh.exec('npm install node-sass', { silent: true });
    return ng(['generate', 'component', 'test-component'])
    .then(() => {
      let componentPath = path.join(process.cwd(), 'src', 'client', 'app', 'test-component');
      let cssFile = path.join(componentPath, 'test-component.component.css');
      let scssFile = path.join(componentPath, 'test-component.component.scss');

      expect(existsSync(componentPath)).to.be.equal(true);
      sh.mv(cssFile, scssFile);
      expect(existsSync(scssFile)).to.be.equal(true);
      expect(existsSync(cssFile)).to.be.equal(false);
      let scssExample = '.outer {\n  .inner { background: #fff; }\n }';
      fs.writeFileSync(scssFile, scssExample, 'utf8');

      sh.exec('ng build --silent');
      let destCss = path.join(process.cwd(), 'dist', 'app', 'test-component', 'test-component.component.css');
      expect(existsSync(destCss)).to.be.equal(true);
      let contents = fs.readFileSync(destCss, 'utf8');
      expect(contents).to.include('.outer .inner');

      sh.rm('-f', destCss);
      process.chdir('src');
      sh.exec('ng build --silent');
      expect(existsSync(destCss)).to.be.equal(true);
      contents = fs.readFileSync(destCss, 'utf8');
      expect(contents).to.include('.outer .inner');

      process.chdir('..');
      sh.exec('npm uninstall node-sass', { silent: true });
    });
  });

  it('Installs less support successfully', function() {
    this.timeout(420000);

    sh.exec('npm install less', { silent: true });
    return ng(['generate', 'component', 'test-component'])
    .then(() => {
      let componentPath = path.join(process.cwd(), 'src', 'client', 'app', 'test-component');
      let cssFile = path.join(componentPath, 'test-component.component.css');
      let lessFile = path.join(componentPath, 'test-component.component.less');

      expect(existsSync(componentPath)).to.be.equal(true);
      sh.mv(cssFile, lessFile);
      expect(existsSync(lessFile)).to.be.equal(true);
      expect(existsSync(cssFile)).to.be.equal(false);
      let lessExample = '.outer {\n  .inner { background: #fff; }\n }';
      fs.writeFileSync(lessFile, lessExample, 'utf8');

      sh.exec('ng build --silent');
      let destCss = path.join(process.cwd(), 'dist', 'app', 'test-component', 'test-component.component.css');
      expect(existsSync(destCss)).to.be.equal(true);
      let contents = fs.readFileSync(destCss, 'utf8');
      expect(contents).to.include('.outer .inner');

      sh.rm('-f', destCss);
      process.chdir('src');
      sh.exec('ng build --silent');
      expect(existsSync(destCss)).to.be.equal(true);
      contents = fs.readFileSync(destCss, 'utf8');
      expect(contents).to.include('.outer .inner');

      process.chdir('..');
      sh.exec('npm uninstall less', { silent: true });
    });
  });

  it('Installs stylus support successfully', function() {
    this.timeout(420000);

    sh.exec('npm install stylus', { silent: true });
    return ng(['generate', 'component', 'test-component'])
    .then(() => {
      let componentPath = path.join(process.cwd(), 'src', 'client', 'app', 'test-component');
      let cssFile = path.join(componentPath, 'test-component.component.css');
      let stylusFile = path.join(componentPath, 'test-component.component.styl');

      sh.mv(cssFile, stylusFile);
      expect(existsSync(stylusFile)).to.be.equal(true);
      expect(existsSync(cssFile)).to.be.equal(false);
      let stylusExample = '.outer {\n  .inner { background: #fff; }\n }';
      fs.writeFileSync(stylusFile, stylusExample, 'utf8');

      sh.exec('ng build --silent');
      let destCss = path.join(process.cwd(), 'dist', 'app', 'test-component', 'test-component.component.css');
      expect(existsSync(destCss)).to.be.equal(true);
      let contents = fs.readFileSync(destCss, 'utf8');
      expect(contents).to.include('.outer .inner');

      sh.rm('-f', destCss);
      process.chdir('src');
      sh.exec('ng build --silent');
      expect(existsSync(destCss)).to.be.equal(true);
      contents = fs.readFileSync(destCss, 'utf8');
      expect(contents).to.include('.outer .inner');

      process.chdir('..');
      sh.exec('npm uninstall stylus', { silent: true });
    });
  });

  it('Turn on `noImplicitAny` in tsconfig.json and rebuild', function (done) {
    this.timeout(420000);

    const configFilePath = path.join(process.cwd(), 'src', 'client', 'tsconfig.json');
    let config = require(configFilePath);

    config.compilerOptions.noImplicitAny = true;
    fs.writeFileSync(configFilePath, JSON.stringify(config), 'utf8');

    sh.rm('-rf', path.join(process.cwd(), 'dist'));

    return ng(['build', '--silent'])
      .then(function () {
        expect(existsSync(path.join(process.cwd(), 'dist'))).to.be.equal(true);
      })
      .catch(() => {
        throw new Error('Build failed.');
      })
      .finally(function () {
        // Clean `tmp` folder
        process.chdir(path.resolve(root, '..'));
        sh.rm('-rf', './tmp');  // tmp.teardown takes too long
        done();
      });
  });

});
