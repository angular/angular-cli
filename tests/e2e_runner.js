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

});
**/
