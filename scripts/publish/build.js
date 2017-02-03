#!/usr/bin/env node
'use strict';

/* eslint-disable no-console */
const chalk = require('chalk');
const denodeify = require('denodeify');
const fs = require('fs');
const glob = denodeify(require('glob'));
const path = require('path');
const npmRun = require('npm-run');
const rimraf = denodeify(require('rimraf'));


const root = path.join(__dirname, '../..');
const dist = path.join(root, 'dist');
const packagesRoot = path.join(root, 'packages');


function copy(from, to) {
  from = path.relative(process.cwd(), from);
  to = path.relative(process.cwd(), to);
  return new Promise((resolve, reject) => {
    const rs = fs.createReadStream(from);
    const ws = fs.createWriteStream(to);

    rs.on('error', reject);
    ws.on('error', reject);
    ws.on('close', resolve);

    rs.pipe(ws);
  });
}


function rm(p) {
  path.relative(process.cwd(), p);
  return new Promise((resolve, reject) => {
    fs.unlink(p, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}


function getDeps(pkg) {
  const packageJson = require(pkg.packageJson);
  return Object.assign({}, packageJson['dependencies'], packageJson['devDependencies']);
}


// First delete the dist folder.
Promise.resolve()
  .then(() => console.log('Deleting dist folder...'))
  .then(() => rimraf(dist))
  .then(() => console.log('Creating schema.d.ts...'))
  .then(() => {
    const script = path.join(root, 'scripts/build-schema-dts.js');
    const input = path.join(root, 'packages/@angular/cli/lib/config/schema.json');
    const output = path.join(root, 'packages/@angular/cli/lib/config/schema.d.ts');
    return npmRun.execSync(`node "${script}" "${input}" "${output}"`);
  })
  .then(() => console.log('Compiling packages...'))
  .then(() => {
    const packages = require('../../lib/packages');

    // Order packages in order of dependency.
    // We use bubble sort because we need a full topological sort but adding another dependency
    // or implementing a full topo sort would be too much work and I'm lazy. We don't anticipate
    // any large number of
    const sortedPackages = Object.keys(packages);
    let swapped = false;
    do {
      swapped = false;
      for (let i = 0; i < sortedPackages.length - 1; i++) {
        for (let j = i + 1; j < sortedPackages.length; j++) {
          const a = sortedPackages[i];
          const b = sortedPackages[j];

          if (Object.keys(getDeps(packages[a])).indexOf(b) != -1) {
            // Swap them.
            [sortedPackages[i], sortedPackages[i + 1]] = [sortedPackages[i + 1], sortedPackages[i]];
            swapped = true;
          }
        }
      }
    } while(swapped);

    return sortedPackages
      .reduce((promise, packageName) => {
        const pkg = packages[packageName];
        const name = path.relative(packagesRoot, pkg.root);

        return promise.then(() => {
          console.log(`  ${name}`);
          try {
            return npmRun.execSync(`tsc -p "${path.relative(process.cwd(), pkg.root)}"`);
          } catch (err) {
            throw new Error(`Compilation error.\n${err.stdout}`);
          }
        });
      }, Promise.resolve());
  })
  .then(() => console.log('Copying uncompiled resources...'))
  .then(() => glob(path.join(packagesRoot, '**/*'), { dot: true }))
  .then(files => {
    console.log(`Found ${files.length} files...`);
    return files
      .map((fileName) => path.relative(packagesRoot, fileName))
      .filter((fileName) => {
        if (/^@angular[\\\/]cli[\\\/]blueprints/.test(fileName)) {
          return true;
        }
        if (/\.d\.ts$/.test(fileName)) {
          // The last thing we want is d.ts files...
          return false;
        }
        if (/\.spec\.ts$/.test(fileName)) {
          // Also spec.ts files...
          return false;
        }
        if (/spec-utils.ts/.test(fileName)) {
          // TODO: get rid of this by splitting spec utils in its own package.
          return false;
        }
        if (/\.ts$/.test(fileName)) {
          // Verify that it was actually built.
          if (!fs.existsSync(path.join(dist, fileName).replace(/ts$/, 'js'))) {
            throw new Error(`Source found but compiled file not found: "${fileName}".`);
          }

          // Skip all source files, since we have their JS files now.
          return false;
        }

        // The only remaining file we want to ignore is tsconfig and spec files.
        return !(/tsconfig\.json$/.test(fileName))
            && !(/\.spec\./.test(fileName))
            && !(/[\/\\]tests[\/\\]/.test(fileName));
      })
      .map((fileName) => {
        const source = path.join(packagesRoot, fileName);
        const dest = path.join(dist, fileName);

        if (fs.statSync(source).isDirectory()) {
          try {
            fs.mkdirSync(dest);
          } catch (err) {
            if (err.code != 'EEXIST') {
              throw err;
            }
          }
        } else {
          return copy(source, dest);
        }
      })
      .reduce((promise, current) => {
        return promise.then(() => current);
      }, Promise.resolve());
  })
  .then(() => glob(path.join(dist, '**/*.spec.*')))
  .then(specFiles => specFiles.filter(fileName => {
    return !/[\\\/]@angular[\\\/]cli[\\\/]blueprints/.test(fileName);
  }))
  .then(specFiles => {
    console.log(`Found ${specFiles.length} spec files...`);
    return Promise.all(specFiles.map(rm));
  })
  .then(() => {
    // Copy all resources that might have been missed.
    const extraFiles = ['CHANGELOG.md', 'CONTRIBUTING.md', 'README.md'];
    return Promise.all(extraFiles.map(fileName => {
      console.log(`Copying ${fileName}...`);
      return copy(fileName, path.join('dist/@angular/cli', fileName));
    }));
  })
  .then(() => {
    // Copy LICENSE into all the packages
    console.log('Copying LICENSE...');

    const packages = require('../../lib/packages');
    return Promise.all(Object.keys(packages).map(pkgName => {
      const pkg = packages[pkgName];
      console.log(`  ${pkgName}`);
      return copy('LICENSE', path.join(pkg.dist, 'LICENSE'));
    }));
  })
  .then(() => process.exit(0), (err) => {
    console.error(chalk.red(err.message));
    process.exit(1);
  });
