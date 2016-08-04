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
const it_mobile = isMobileTest() ? it : function() {};
const it_not_mobile = isMobileTest() ? function() {} : it;

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

    expect(mainBundleContent).to.include('production: true');
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

  it('moves all files that live inside `public` into `dist`', function () {
    this.timeout(420000);

    const tmpFile = path.join(process.cwd(), 'public', 'test.abc');
    const tmpFileLocation = path.join(process.cwd(), 'dist', 'test.abc');
    fs.writeFileSync(tmpFile, 'hello world');

    sh.exec(`${ngBin} build`);
    expect(existsSync(tmpFileLocation)).to.be.equal(true);
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
});

function isMobileTest() {
  return !!process.env['MOBILE_TEST'];
}
