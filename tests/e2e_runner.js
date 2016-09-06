/*eslint-disable no-console */
'use strict';

/**
 * This file is ran using the command line, not using Jasmine / Mocha.
 */
const chalk = require('chalk');
const glob = require('glob');
const minimist = require('minimist');
const path = require('path');
const blue = chalk.blue;
const bold = chalk.bold;
const green = chalk.green;
const red = chalk.red;


require('../lib/bootstrap-local');


const argv = minimist(process.argv.slice(2));


let currentFileName = null;
let lastStart = null;

const e2eRoot = path.join(__dirname, 'e2e');
const allTests = glob.sync(path.join(e2eRoot, '**/*'), { nodir: true })
  .map(name => path.relative(e2eRoot, name))
  .filter(name => name.match(/^\d\d\d/))
  .sort();


/**
 * Load all the files from the e2e, filter and sort them and build a promise of their default
 * export.
 */
allTests.reduce((previous, relativeName) => {
  const absoluteName = path.join(e2eRoot, relativeName);
  return previous.then(() => {
    currentFileName = relativeName.replace(/\.ts$/, '');

    if (lastStart) {
      // Round to hundredth of a second.
      const t = Math.round((Date.now() - lastStart) / 10) / 100;
      console.log('');
      console.log(green('Last step took ') + bold(blue(t)) + green('s...'));
    }

    const testName = currentFileName.replace(/\d\d\d-/g, '');
    console.log(green('Running "' + bold(blue(testName)) + '"...'));

    lastStart = +new Date();
    const fn = require(absoluteName);
    return (fn.default || fn)();
  });
}, Promise.resolve())
.then(
  () => console.log(green('Done.')),
  (err) => {
    console.log('\n');
    console.error(red(`Test "${currentFileName}" failed...`));
    console.error(red(err.message));
    console.error(red(err.stack));

    if (argv.debug) {
      console.log('Will loop forever while you debug... CTRL-C to quit.');
      /*eslint-disable no-constant-condition*/
      while (1) {
        // That's right!
      }
    }

    process.exit(1);
  }
);

/**
 *
  it_mobile('Does not include mobile prod features', () => {
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

**/
