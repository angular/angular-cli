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
var express = require('express');
var http = require('http');
var request = require('request');

function existsSync(path) {
  try {
    fs.accessSync(path);
    return true;
  } catch (e) {
    return false;
  }
}

const ngBin = `node ${path.join(process.cwd(), 'bin', 'ng')}`;
const it_mobile = isMobileTest() ? it : function() {};
const it_not_mobile = isMobileTest() ? function() {} : it;

describe('Basic end-to-end Workflow', function () {
  before(conf.setup);

  after(conf.restore);

  var testArgs = ['test', '--watch', 'false'];

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
    let args = ['--link-cli'];
    // If testing in the mobile matrix on Travis, create project with mobile flag
    if (isMobileTest()) {
      args = args.concat(['--mobile']);
    }
    return ng(['new', 'test-project'].concat(args)).then(function () {
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
    const indexHtml = fs.readFileSync(path.join(process.cwd(), 'dist/index.html'), 'utf-8');
    // Check for cache busting hash script src
    expect(indexHtml).to.match(/main\.[0-9a-f]{20}\.bundle\.js/);
    // Also does not create new things in GIT.
    expect(sh.exec('git status --porcelain').output).to.be.equal(undefined);
  });

  it_mobile('Enables mobile-specific production features in prod builds', () => {
    let indexHtml = fs.readFileSync(path.join(process.cwd(), 'dist/index.html'), 'utf-8');
    // Service Worker
    expect(indexHtml).to.match(/sw-install\.[0-9a-f]{20}\.bundle\.js/);
    expect(existsSync(path.join(process.cwd(), 'dist/sw.js' ))).to.be.equal(true);

    // App Manifest
    expect(indexHtml.includes('<link rel="manifest" href="/manifest.webapp">')).to.be.equal(true);
    expect(existsSync(path.join(process.cwd(), 'dist/manifest.webapp'))).to.be.equal(true);

    // Icons folder
    expect(existsSync(path.join(process.cwd(), 'dist/icons'))).to.be.equal(true);

    // Prerender content
    expect(indexHtml).to.match(/app works!/);
  });

  it('Supports build config file replacement', function() {
    this.timeout(420000);

    sh.exec(`${ngBin} build --env=prod`);
    var mainBundlePath = path.join(process.cwd(), 'dist', 'main.bundle.js');
    var mainBundleContent = fs.readFileSync(mainBundlePath, { encoding: 'utf8' });

    expect(mainBundleContent.includes('production: true')).to.be.equal(true);
  });

  it('Build fails on invalid build target', function (done) {
    this.timeout(420000);
    sh.exec(`${ngBin} build --target=potato`, (code) => {
      expect(code).to.not.equal(0);
      done();
    });
  });

  it('Build fails on invalid environment file', function (done) {
    this.timeout(420000);
    sh.exec(`${ngBin} build --environment=potato`, (code) => {
      expect(code).to.not.equal(0);
      done();
    });
  });

  it('Supports base tag modifications via `ng build --base-href`', function() {
    this.timeout(420000);

    sh.exec(`${ngBin} build --base-href /myUrl/`);
    const indexHtmlPath = path.join(process.cwd(), 'dist/index.html'); 
    const indexHtml = fs.readFileSync(indexHtmlPath, { encoding: 'utf8' });

    expect(indexHtml).to.match(/<base href="\/myUrl\/"/);
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
        expect(indexHtml).to.include('main.bundle.js');
      })
      .then(function () {
        // Also does not create new things in GIT.
        expect(sh.exec('git status --porcelain').output).to.be.equal(undefined);
      });
  });

  it('Build pack output files into a different folder', function () {
    this.timeout(420000);

    return ng(['build', '-o', './build-output'])
      .catch(() => {
        throw new Error('Build failed.');
      })
      .then(function () {
        expect(existsSync(path.join(process.cwd(), './build-output'))).to.be.equal(true);
      });
  });

  it_mobile('Does not include mobile prod features', () => {
    let index = fs.readFileSync(path.join(process.cwd(), 'dist/index.html'), 'utf-8');
    // Service Worker
    expect(index.includes('if (\'serviceWorker\' in navigator) {')).to.be.equal(false);
    expect(existsSync(path.join(process.cwd(), 'dist/worker.js'))).to.be.equal(false);

    // Asynchronous bundle
    expect(index.includes('<script src="/app-concat.js" async></script>')).to.be.equal(false);
    expect(existsSync(path.join(process.cwd(), 'dist/app-concat.js'))).to.be.equal(false);
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

  it('Make sure the correct coverage folder is created', function () {
    const coverageReport = path.join(process.cwd(), 'coverage', 'src', 'app');

    expect(existsSync(coverageReport)).to.be.equal(true);
  });

  it('Make sure that LCOV file is generated inside coverage folder', function() {
    const lcovReport = path.join(process.cwd(), 'coverage', 'coverage.lcov');

    expect(existsSync(lcovReport)).to.be.equal(true);
  });

  it('moves all files that live inside `assets` into `dist`', function () {
    this.timeout(420000);

    const dotFile = path.join(process.cwd(), 'src', 'assets', '.file');
    const distDotFile = path.join(process.cwd(), 'dist', 'assets', '.file');
    fs.writeFileSync(dotFile, '');
    const testFile = path.join(process.cwd(), 'src', 'assets', 'test.abc');
    const distTestFile = path.join(process.cwd(), 'dist', 'assets', 'test.abc');
    fs.writeFileSync(testFile, 'hello world');
    const distDotGitkeep = path.join(process.cwd(), 'dist', 'assets', '.gitkeep');

    sh.exec(`${ngBin} build`);
    expect(existsSync(distDotFile)).to.be.equal(true);
    expect(existsSync(distTestFile)).to.be.equal(true);
    expect(existsSync(distDotGitkeep)).to.be.equal(false);
  });

  // Mobile mode doesn't have styles
  it_not_mobile('Supports scss in styleUrls', function() {
    this.timeout(420000);

    let cssFilename = 'app.component.css';
    let scssFilename = 'app.component.scss';
    let componentPath = path.join(process.cwd(), 'src', 'app');
    let componentFile = path.join(componentPath, 'app.component.ts');
    let cssFile = path.join(componentPath, cssFilename);
    let scssFile = path.join(componentPath, scssFilename);
    let scssExample = '@import "app.component.partial";\n\n.outer {\n  .inner { background: #fff; }\n }';
    let scssPartialFile = path.join(componentPath, '_app.component.partial.scss');
    let scssPartialExample = '.partial {\n @extend .outer;\n }';
    let componentContents = fs.readFileSync(componentFile, 'utf8');

    sh.mv(cssFile, scssFile);
    fs.writeFileSync(scssFile, scssExample, 'utf8');
    fs.writeFileSync(scssPartialFile, scssPartialExample, 'utf8');
    fs.writeFileSync(componentFile, componentContents.replace(new RegExp(cssFilename, 'g'), scssFilename), 'utf8');

    sh.exec(`${ngBin} build`);
    let destCssBundle = path.join(process.cwd(), 'dist', 'main.bundle.js');
    let contents = fs.readFileSync(destCssBundle, 'utf8');
    expect(contents).to.include('.outer .inner');
    expect(contents).to.include('.partial .inner');

    sh.mv(scssFile, cssFile);
    fs.writeFileSync(cssFile, '', 'utf8');
    fs.writeFileSync(componentFile, componentContents, 'utf8');
    sh.rm('-f', scssPartialFile);
  });

  it_not_mobile('Supports sass in styleUrls', function() {
    this.timeout(420000);

    let cssFilename = 'app.component.css';
    let sassFilename = 'app.component.sass';
    let componentPath = path.join(process.cwd(), 'src', 'app');
    let componentFile = path.join(componentPath, 'app.component.ts');
    let cssFile = path.join(componentPath, cssFilename);
    let sassFile = path.join(componentPath, sassFilename);
    let sassExample = '@import "app.component.partial";\n\n.outer\n  .inner\n    background: #fff';
    let sassPartialFile = path.join(componentPath, '_app.component.partial.sass');
    let sassPartialExample = '.partial\n  @extend .outer';
    let componentContents = fs.readFileSync(componentFile, 'utf8');

    sh.mv(cssFile, sassFile);
    fs.writeFileSync(sassFile, sassExample, 'utf8');
    fs.writeFileSync(sassPartialFile, sassPartialExample, 'utf8');
    fs.writeFileSync(componentFile, componentContents.replace(new RegExp(cssFilename, 'g'), sassFilename), 'utf8');

    sh.exec(`${ngBin} build`);
    let destCssBundle = path.join(process.cwd(), 'dist', 'main.bundle.js');
    let contents = fs.readFileSync(destCssBundle, 'utf8');
    expect(contents).to.include('.outer .inner');
    expect(contents).to.include('.partial .inner');

    sh.mv(sassFile, cssFile);
    fs.writeFileSync(cssFile, '', 'utf8');
    fs.writeFileSync(componentFile, componentContents, 'utf8');
    sh.rm('-f', sassPartialFile);
  });

  // Mobile mode doesn't have styles
  it_not_mobile('Supports less in styleUrls', function() {
    this.timeout(420000);

    let cssFilename = 'app.component.css';
    let lessFilename = 'app.component.less';
    let componentPath = path.join(process.cwd(), 'src', 'app');
    let componentFile = path.join(componentPath, 'app.component.ts');
    let cssFile = path.join(componentPath, cssFilename);
    let lessFile = path.join(componentPath, lessFilename);
    let lessExample = '.outer {\n  .inner { background: #fff; }\n }';
    let componentContents = fs.readFileSync(componentFile, 'utf8');

    sh.mv(cssFile, lessFile);
    fs.writeFileSync(lessFile, lessExample, 'utf8');
    fs.writeFileSync(componentFile, componentContents.replace(new RegExp(cssFilename, 'g'), lessFilename), 'utf8');

    sh.exec(`${ngBin} build`);
    let destCssBundle = path.join(process.cwd(), 'dist', 'main.bundle.js');
    let contents = fs.readFileSync(destCssBundle, 'utf8');
    expect(contents).to.include('.outer .inner');

    fs.writeFileSync(lessFile, '', 'utf8');
    sh.mv(lessFile, cssFile);
    fs.writeFileSync(componentFile, componentContents, 'utf8');
  });

  // Mobile mode doesn't have styles
  it_not_mobile('Supports stylus in styleUrls', function() {
    this.timeout(420000);

    let cssFilename = 'app.component.css';
    let stylusFilename = 'app.component.scss';
    let componentPath = path.join(process.cwd(), 'src', 'app');
    let componentFile = path.join(componentPath, 'app.component.ts');
    let cssFile = path.join(componentPath, cssFilename);
    let stylusFile = path.join(componentPath, stylusFilename);
    let stylusExample = '.outer {\n  .inner { background: #fff; }\n }';
    let componentContents = fs.readFileSync(componentFile, 'utf8');

    sh.mv(cssFile, stylusFile);
    fs.writeFileSync(stylusFile, stylusExample, 'utf8');
    fs.writeFileSync(componentFile, componentContents.replace(new RegExp(cssFilename, 'g'), stylusFilename), 'utf8');

    sh.exec(`${ngBin} build`);
    let destCssBundle = path.join(process.cwd(), 'dist', 'main.bundle.js');
    let contents = fs.readFileSync(destCssBundle, 'utf8');
    expect(contents).to.include('.outer .inner');

    fs.writeFileSync(stylusFile, '', 'utf8');
    sh.mv(stylusFile, cssFile);
    fs.writeFileSync(componentFile, componentContents, 'utf8');
  });

  it('Turn on `noImplicitAny` in tsconfig.json and rebuild', function () {
    this.timeout(420000);

    const configFilePath = path.join(process.cwd(), 'src', 'tsconfig.json');
    let config = require(configFilePath);

    config.compilerOptions.noImplicitAny = true;
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');

    sh.rm('-rf', path.join(process.cwd(), 'dist'));

    sh.exec(`${ngBin} build`);
    expect(existsSync(path.join(process.cwd(), 'dist'))).to.be.equal(true);
  });

  it('Turn on path mapping in tsconfig.json and rebuild', function () {
    this.timeout(420000);

    const configFilePath = path.join(process.cwd(), 'src', 'tsconfig.json');
    let config = require(configFilePath);

    config.compilerOptions.baseUrl = '';

    // #TODO: When https://github.com/Microsoft/TypeScript/issues/9772 is fixed this should fail.
    config.compilerOptions.paths = { '@angular/*': [] };
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');

    sh.exec(`${ngBin} build`);
    // #TODO: Uncomment these lines when https://github.com/Microsoft/TypeScript/issues/9772 is fixed.
    // .catch(() => {
    //   return true;
    // })
    // .then((passed) => {
    //   expect(passed).to.equal(true);
    // })

    // This should succeed.
    config.compilerOptions.paths = {
      '@angular/*': [ '../node_modules/@angular/*' ]
    };
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');
    sh.exec(`${ngBin} build`);

    expect(existsSync(path.join(process.cwd(), 'dist'))).to.be.equal(true);
    const indexHtml = fs.readFileSync(path.join(process.cwd(), 'dist/index.html'), 'utf-8');
    expect(indexHtml).to.include('main.bundle.js');
  });

  it('styles.css is added to styles bundle', function() {
    this.timeout(420000);

    let stylesPath = path.join(process.cwd(), 'src', 'styles.css');
    let testStyle = 'body { background-color: blue; }';
    fs.writeFileSync(stylesPath, testStyle, 'utf8');

    sh.exec(`${ngBin} build`);

    var stylesBundlePath = path.join(process.cwd(), 'dist', 'styles.bundle.js');
    var stylesBundleContent = fs.readFileSync(stylesBundlePath, { encoding: 'utf8' });

    expect(stylesBundleContent.includes(testStyle)).to.be.equal(true);
  });

  it('styles.css supports css imports', function() {
    this.timeout(420000);

    let importedStylePath = path.join(process.cwd(), 'src', 'imported-styles.css');
    let testStyle = 'body { background-color: blue; }';
    fs.writeFileSync(importedStylePath, testStyle, 'utf8');

    let stylesPath = path.join(process.cwd(), 'src', 'styles.css');
    let importStyle = '@import \'./imported-styles.css\';';
    fs.writeFileSync(stylesPath, importStyle, 'utf8');

    sh.exec(`${ngBin} build`);

    var stylesBundlePath = path.join(process.cwd(), 'dist', 'styles.bundle.js');
    var stylesBundleContent = fs.readFileSync(stylesBundlePath, { encoding: 'utf8' });

    expect(stylesBundleContent).to.include(testStyle);
  });

  it('build supports global styles and scripts', function() {
    this.timeout(420000);

    sh.exec('npm install bootstrap@next', { silent: true });

    const configFile = path.join(process.cwd(), 'angular-cli.json');
    let originalConfigContent = fs.readFileSync(configFile, { encoding: 'utf8' });
    let configContent = originalConfigContent.replace('"styles.css"', `
      "styles.css",
      "../node_modules/bootstrap/dist/css/bootstrap.css"
    `).replace('"scripts": [],',`
      "scripts": [
        "../node_modules/jquery/dist/jquery.js",
        "../node_modules/tether/dist/js/tether.js",
        "../node_modules/bootstrap/dist/js/bootstrap.js"
      ],
    `);

    fs.writeFileSync(configFile, configContent, 'utf8');

    sh.exec(`${ngBin} build`);

    // checking for strings that are part of the included files
    const stylesBundlePath = path.join(process.cwd(), 'dist', 'styles.bundle.js');
    const stylesBundleContent = fs.readFileSync(stylesBundlePath, { encoding: 'utf8' });
    expect(stylesBundleContent).to.include('* Bootstrap ');

    const scriptsBundlePath = path.join(process.cwd(), 'dist', 'scripts.bundle.js');
    const scriptsBundleContent = fs.readFileSync(scriptsBundlePath, { encoding: 'utf8' });
    expect(scriptsBundleContent).to.include('* jQuery JavaScript');
    expect(scriptsBundleContent).to.include('/*! tether ');
    expect(scriptsBundleContent).to.include('* Bootstrap ');

    // check the scripts are loaded in the correct order
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    const indexContent = fs.readFileSync(indexPath, { encoding: 'utf8' });
    let scriptTags = '<script type="text/javascript" src="inline.js"></script>' +
                    '<script type="text/javascript" src="styles.bundle.js"></script>' +
                    '<script type="text/javascript" src="scripts.bundle.js"></script>' +
                    '<script type="text/javascript" src="main.bundle.js"></script>'
    expect(indexContent).to.include(scriptTags);

    // restore config
    fs.writeFileSync(configFile, originalConfigContent, 'utf8');
  });

  it('Serve and run e2e tests on dev environment', function () {
    this.timeout(240000);

    var ngServePid;

    function executor(resolve, reject) {
      var serveProcess = child_process.exec(`${ngBin} serve`, { maxBuffer: 500*1024 });
      var startedProtractor = false;
      ngServePid = serveProcess.pid;

      serveProcess.stdout.on('data', (data) => {
        if (/webpack: bundle is now VALID/.test(data.toString('utf-8')) && !startedProtractor) {
          startedProtractor = true;
          child_process.exec(`${ngBin} e2e`, (error, stdout, stderr) => {
            if (error !== null) {
              reject(stderr)
            } else {
              resolve();
            }
          });
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

  it('Serve and run e2e tests on prod environment', function () {
    this.timeout(240000);

    var ngServePid;

    function executor(resolve, reject) {
      var serveProcess = child_process.exec(`${ngBin} serve -e=prod`, { maxBuffer: 500*1024 });
      var startedProtractor = false;
      ngServePid = serveProcess.pid;

      serveProcess.stdout.on('data', (data) => {
        if (/webpack: bundle is now VALID/.test(data.toString('utf-8')) && !startedProtractor) {
          startedProtractor = true;
          child_process.exec(`${ngBin} e2e`, (error, stdout, stderr) => {
            if (error !== null) {
              reject(stderr)
            } else {
              resolve();
            }
          });
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

  it('Serve with proxy config', function () {
    this.timeout(240000);
    var ngServePid;
    var server;

    function executor(resolve, reject) {
      var startedProtractor = false;
      var app = express();
      server = http.createServer(app);
      server.listen();
      app.set('port', server.address().port);

      app.get('/api/test', function (req, res) {
        res.send('TEST_API_RETURN');
      });
      var backendHost = 'localhost';
      var backendPort = server.address().port

      var proxyServerUrl = `http://${backendHost}:${backendPort}`;
      const proxyConfigFile = path.join(process.cwd(), 'proxy.config.json');
      const proxyConfig = {
        '/api/*': {
          target: proxyServerUrl
        }
      };
      fs.writeFileSync(proxyConfigFile, JSON.stringify(proxyConfig, null, 2), 'utf8');
      var serveProcess = child_process.exec(`${ngBin} serve --proxy-config proxy.config.json`, { maxBuffer: 500 * 1024 });
      ngServePid = serveProcess.pid;

      serveProcess.stdout.on('data', (data) => {
        if (/webpack: bundle is now VALID/.test(data.toString('utf-8')) && !startedProtractor) {

          // How to get the url with out hardcoding here?
          request( 'http://localhost:4200/api/test', function(err, response, body) {
            expect(response.statusCode).to.be.equal(200);
            expect(body).to.be.equal('TEST_API_RETURN');
            resolve();
          });
        }
      });

      serveProcess.stderr.on('data', (data) => {
        reject(data);
      });
      serveProcess.on('close', (code) => {
        code === 0 ? resolve() : reject('ng serve command closed with error')
      });
    }

    // Need a way to close the express server
    return new Promise(executor)
      .then(() => {
        if (ngServePid) treeKill(ngServePid);
        if(server){
          server.close();
        }
      })
      .catch((msg) => {
        if (ngServePid) treeKill(ngServePid);
        if(server){
          server.close();
        }
        throw new Error(msg);
      });
  });

  it('Serve fails on invalid proxy config file', function (done) {
    this.timeout(420000);
    sh.exec(`${ngBin} serve --proxy-config proxy.config.does_not_exist.json`, (code) => {
      expect(code).to.not.equal(0);
      done();
    });
  });

});

function isMobileTest() {
  return !!process.env['MOBILE_TEST'];
}
