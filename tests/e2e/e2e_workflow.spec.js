'use strict';

var fs = require('fs');
var path = require('path');
var tmp = require('../helpers/tmp');
var chai = require('chai');
var expect = chai.expect;
var conf = require('ember-cli/tests/helpers/conf');
var sh = require('shelljs');
var treeKill = require('tree-kill');
var child_process = require('child_process');
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

const ngBin = `node ${path.join(process.cwd(), 'bin', 'ng')}`;

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

    return ng(['new', 'test-project', '--link-cli=true']).then(function () {
      expect(existsSync(path.join(root, 'test-project')));
    });
  });

  it('Can change current working directory to `test-project`', function () {
    process.chdir(path.join(root, 'test-project'));
    expect(path.basename(process.cwd())).to.equal('test-project');
  });

  it('Supports production builds via `ng build -prod`', function() {
    this.timeout(420000);

    // Can't use the `ng` helper because somewhere the environment gets
    // stuck to the first build done
    sh.exec(`${ngBin} build -prod`);
    expect(existsSync(path.join(process.cwd(), 'dist'))).to.be.equal(true);
    var mainBundlePath = path.join(process.cwd(), 'dist', 'main.js');
    var mainBundleContent = fs.readFileSync(mainBundlePath, { encoding: 'utf8' });
    // production: true minimized turns into production:!0
    expect(mainBundleContent).to.include('production:!0');
    // Also does not create new things in GIT.
    expect(sh.exec('git status --porcelain').output).to.be.equal(undefined);
  });

  it('Can run `ng build` in created project', function () {
    this.timeout(420000);

    return ng(['build'])
      .catch(() => {
        throw new Error('Build failed.');
      })
      .then(function () {
        expect(existsSync(path.join(process.cwd(), 'dist'))).to.be.equal(true);

        // Check the index.html to have no handlebar tokens in it.
        const indexHtml = fs.readFileSync(path.join(process.cwd(), 'dist/index.html'), 'utf-8');
        expect(indexHtml).to.not.include('{{');
        expect(indexHtml).to.include('vendor/es6-shim/es6-shim.js');
      })
      .then(function () {
        // Also does not create new things in GIT.
        expect(sh.exec('git status --porcelain').output).to.be.equal(undefined);
      });
  });

  it('lints', () => {
    this.timeout(420000);

    return ng(['lint']).then(() => {
    })
    .catch(err => {
      throw new Error('Linting failed: ' + err);
    });
  });

  it('Perform `ng test` after initial build', function () {
    this.timeout(420000);

    return ng(testArgs).then(function (result) {
      const exitCode = typeof result === 'object' ? result.exitCode : result;
      expect(exitCode).to.be.equal(0);
    });
  });

  it('ng e2e fails with error exit code', function () {
    this.timeout(240000);

    function executor(resolve, reject) {
      child_process.exec(`${ngBin} e2e`, (error, stdout, stderr) => {
        if (error !== null) {
          resolve(stderr);
        } else {
          reject(stdout);
        }
      });
    }

    return new Promise(executor)
      .catch((msg) => {
        throw new Error(msg);
      });
  });

  it('Serve and run e2e tests after initial build', function () {
    this.timeout(240000);

    var ngServePid;

    function executor(resolve, reject) {
      var serveProcess = child_process.exec(`${ngBin} serve`);
      var startedProtractor = false;
      ngServePid = serveProcess.pid;

      serveProcess.stdout.on('data', (data) => {
        if (/Build successful/.test(data) && !startedProtractor) {
          startedProtractor = true;
          child_process.exec(`${ngBin} e2e`, (error, stdout, stderr) => {
            if (error !== null) {
              reject(stderr)
            } else {
              resolve();
            }
          });
        } else if (/ failed with:/.test(data)) {
          reject(data);
        }
      });

      serveProcess.stderr.on('data', (data) => {
        reject(data);
      });
      serveProcess.on('close', (code) => {
        code === 0 ? resolve() : reject('ng serve command closed with error')
      });
    }

    return new Promise(executor)
      .then(() => {
        if (ngServePid) treeKill(ngServePid);
      })
      .catch((msg) => {
        if (ngServePid) treeKill(ngServePid);
        throw new Error(msg);
      });
  });

  it('Can create a test component using `ng generate component test-component`', function () {
    this.timeout(10000);
    return ng(['generate', 'component', 'test-component']).then(function () {
      var componentDir = path.join(process.cwd(), 'src', 'app', 'test-component');
      expect(existsSync(componentDir)).to.be.equal(true);
      expect(existsSync(path.join(componentDir, 'test-component.component.ts'))).to.be.equal(true);
      expect(existsSync(path.join(componentDir, 'test-component.component.html'))).to.be.equal(true);
      expect(existsSync(path.join(componentDir, 'test-component.component.css'))).to.be.equal(true);
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
      var serviceDir = path.join(process.cwd(), 'src', 'app');
      expect(existsSync(serviceDir)).to.be.equal(true);
      expect(existsSync(path.join(serviceDir, 'test-service.service.ts'))).to.be.equal(true);
      expect(existsSync(path.join(serviceDir, 'test-service.service.spec.ts'))).to.be.equal(true);
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
      var pipeDir = path.join(process.cwd(), 'src', 'app');
      expect(existsSync(pipeDir)).to.be.equal(true);
      expect(existsSync(path.join(pipeDir, 'test-pipe.pipe.ts'))).to.be.equal(true);
      expect(existsSync(path.join(pipeDir, 'test-pipe.pipe.spec.ts'))).to.be.equal(true);
    });
  });

  it('Perform `ng test` after adding a pipe', function () {
    this.timeout(420000);

    return ng(testArgs).then(function (result) {
      const exitCode = typeof result === 'object' ? result.exitCode : result;
      expect(exitCode).to.be.equal(0);
    });
  });

  xit('Can create a test route using `ng generate route test-route`', function () {
    return ng(['generate', 'route', 'test-route']).then(function () {
      var routeDir = path.join(process.cwd(), 'src', 'app', '+test-route');
      expect(existsSync(routeDir)).to.be.equal(true);
      expect(existsSync(path.join(routeDir, 'test-route.component.ts'))).to.be.equal(true);
    });
  });

  xit('Perform `ng test` after adding a route', function () {
    this.timeout(420000);

    return ng(testArgs).then(function (result) {
      const exitCode = typeof result === 'object' ? result.exitCode : result;
      expect(exitCode).to.be.equal(0);
    });
  });

  it('Can create a test interface using `ng generate interface test-interface model`', function () {
    return ng(['generate', 'interface', 'test-interface', 'model']).then(function () {
      var interfaceDir = path.join(process.cwd(), 'src', 'app');
      expect(existsSync(interfaceDir)).to.be.equal(true);
      expect(existsSync(path.join(interfaceDir, 'test-interface.model.ts'))).to.be.equal(true);
    });
  });

  it('Perform `ng test` after adding a interface', function () {
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

    return ng(['build'])
      .then(function () {
        expect(existsSync(tmpFileLocation)).to.be.equal(true);
      })
      .catch(err => {
        throw new Error(err)
      });
  });

  it.skip('Installs sass support successfully', function() {
    this.timeout(420000);

    sh.exec('npm install node-sass', { silent: true });
    return ng(['generate', 'component', 'test-component'])
    .then(() => {
      let componentPath = path.join(process.cwd(), 'src', 'app', 'test-component');
      let cssFile = path.join(componentPath, 'test-component.component.css');
      let scssFile = path.join(componentPath, 'test-component.component.scss');
      let scssPartialFile = path.join(componentPath, '_test-component.component.partial.scss');

      let scssPartialExample = '.partial {\n @extend .outer;\n }';
      fs.writeFileSync(scssPartialFile, scssPartialExample, 'utf8');
      expect(existsSync(scssPartialFile)).to.be.equal(true);

      expect(existsSync(componentPath)).to.be.equal(true);
      sh.mv(cssFile, scssFile);
      expect(existsSync(scssFile)).to.be.equal(true);
      expect(existsSync(cssFile)).to.be.equal(false);
      let scssExample = '@import "test-component.component.partial";\n\n.outer {\n  .inner { background: #fff; }\n }';
      fs.writeFileSync(scssFile, scssExample, 'utf8');

      sh.exec(`${ngBin} build`);
      let destCss = path.join(process.cwd(), 'dist', 'app', 'test-component', 'test-component.component.css');
      expect(existsSync(destCss)).to.be.equal(true);
      let contents = fs.readFileSync(destCss, 'utf8');
      expect(contents).to.include('.outer .inner');
      expect(contents).to.include('.partial .inner');

      sh.rm('-f', destCss);
      process.chdir('src');
      sh.exec(`${ngBin} build`);
      expect(existsSync(destCss)).to.be.equal(true);
      contents = fs.readFileSync(destCss, 'utf8');
      expect(contents).to.include('.outer .inner');
      expect(contents).to.include('.partial .inner');

      process.chdir('..');
      sh.exec('npm uninstall node-sass', { silent: true });
    });
  });

  it.skip('Installs less support successfully', function() {
    this.timeout(420000);

    sh.exec('npm install less', { silent: true });
    return ng(['generate', 'component', 'test-component'])
    .then(() => {
      let componentPath = path.join(process.cwd(), 'src', 'app', 'test-component');
      let cssFile = path.join(componentPath, 'test-component.component.css');
      let lessFile = path.join(componentPath, 'test-component.component.less');

      expect(existsSync(componentPath)).to.be.equal(true);
      sh.mv(cssFile, lessFile);
      expect(existsSync(lessFile)).to.be.equal(true);
      expect(existsSync(cssFile)).to.be.equal(false);
      let lessExample = '.outer {\n  .inner { background: #fff; }\n }';
      fs.writeFileSync(lessFile, lessExample, 'utf8');

      sh.exec(`${ngBin} build`);
      let destCss = path.join(process.cwd(), 'dist', 'app', 'test-component', 'test-component.component.css');
      expect(existsSync(destCss)).to.be.equal(true);
      let contents = fs.readFileSync(destCss, 'utf8');
      expect(contents).to.include('.outer .inner');

      sh.rm('-f', destCss);
      process.chdir('src');
      sh.exec(`${ngBin} build`);
      expect(existsSync(destCss)).to.be.equal(true);
      contents = fs.readFileSync(destCss, 'utf8');
      expect(contents).to.include('.outer .inner');

      process.chdir('..');
      sh.exec('npm uninstall less', { silent: true });
    });
  });

  it.skip('Installs stylus support successfully', function() {
    this.timeout(420000);

    sh.exec('npm install stylus', { silent: true });
    return ng(['generate', 'component', 'test-component'])
    .then(() => {
      let componentPath = path.join(process.cwd(), 'src', 'app', 'test-component');
      let cssFile = path.join(componentPath, 'test-component.component.css');
      let stylusFile = path.join(componentPath, 'test-component.component.styl');

      sh.mv(cssFile, stylusFile);
      expect(existsSync(stylusFile)).to.be.equal(true);
      expect(existsSync(cssFile)).to.be.equal(false);
      let stylusExample = '.outer {\n  .inner { background: #fff; }\n }';
      fs.writeFileSync(stylusFile, stylusExample, 'utf8');

      sh.exec(`${ngBin} build`);
      let destCss = path.join(process.cwd(), 'dist', 'app', 'test-component', 'test-component.component.css');
      expect(existsSync(destCss)).to.be.equal(true);
      let contents = fs.readFileSync(destCss, 'utf8');
      expect(contents).to.include('.outer .inner');

      sh.rm('-f', destCss);
      process.chdir('src');
      sh.exec(`${ngBin} build`);
      expect(existsSync(destCss)).to.be.equal(true);
      contents = fs.readFileSync(destCss, 'utf8');
      expect(contents).to.include('.outer .inner');

      process.chdir('..');
      sh.exec('npm uninstall stylus', { silent: true });
    });
  });

  it('Turn on `noImplicitAny` in tsconfig.json and rebuild', function () {
    this.timeout(420000);

    const configFilePath = path.join(process.cwd(), 'src', 'tsconfig.json');
    let config = require(configFilePath);

    config.compilerOptions.noImplicitAny = true;
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');

    sh.rm('-rf', path.join(process.cwd(), 'dist'));

    return ng(['build'])
      .then(() => {
        expect(existsSync(path.join(process.cwd(), 'dist'))).to.be.equal(true);
      });
  });

  it('Turn on path mapping in tsconfig.json and rebuild', function () {
    this.timeout(420000);

    const configFilePath = path.join(process.cwd(), 'src', 'tsconfig.json');
    let config = require(configFilePath);

    config.compilerOptions.baseUrl = '';

    // This should fail.
    config.compilerOptions.paths = { '@angular/*': [] };
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');

    return ng(['build'])
      .catch(() => {
        return true;
      })
      .then((passed) => {
        expect(passed).to.equal(true);
      })
      .then(() => {
        // This should succeed.
        config.compilerOptions.paths = {
          '@angular/*': [ '*' ]
        };
        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');
      })
      .then(() => ng(['build']))
      .catch(() => {
        expect('build failed where it should have succeeded').to.equal('');
      });
  });

  it('Serve and run e2e tests after all other commands', function () {
    this.timeout(240000);

    var ngServePid;

    function executor(resolve, reject) {
      var serveProcess = child_process.exec(`${ngBin} serve`);
      var startedProtractor = false;
      ngServePid = serveProcess.pid;

      serveProcess.stdout.on('data', (data) => {
        if (/Build successful/.test(data) && !startedProtractor) {
          startedProtractor = true;
          child_process.exec(`${ngBin} e2e`, (error, stdout, stderr) => {
            if (error !== null) {
              reject(stderr)
            } else {
              resolve();
            }
          });
        } else if (/ failed with:/.test(data)) {
          reject(data);
        }
      });

      serveProcess.stderr.on('data', (data) => {
        reject(data);
      });
      serveProcess.on('close', (code) => {
        code === 0 ? resolve() : reject('ng serve command closed with error')
      });
    }

    return new Promise(executor)
      .then(() => {
        if (ngServePid) treeKill(ngServePid);
      })
      .catch((msg) => {
        if (ngServePid) treeKill(ngServePid);
        throw new Error(msg);
      });
  });
});
