#!/usr/bin/env node
'use strict';

const fs = require('fs');
const glob = require('glob');
const path = require('path');


const root = path.join(__dirname, '../..');
const dist = path.join(root, 'dist');
const packagesRoot = path.join(root, 'packages');

if (!fs.existsSync(dist)) {
  throw new Error('Couldn\'t find dist folder... Did you build?');
}

if (!fs.existsSync(packagesRoot)) {
  throw new Error('Could not find angular-cli root.');
}


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


glob.sync(path.join(packagesRoot, '**/*'))
  .map((fileName) => path.relative(packagesRoot, fileName))
  .filter((fileName) => {
    if (/^angular-cli\/blueprints\//.test(fileName)) {
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
        && !(/\/tests\//.test(fileName));
  })
  .forEach((fileName) => {
    const source = path.join(packagesRoot, fileName);
    const dest = path.join(dist, fileName);
    console.log(source, '=>', dest);

    if (fs.statSync(source).isDirectory()) {
      try {
        fs.mkdirSync(dest);
      } catch (err) {
        if (err.code != 'EEXIST') {
          throw err;
        }
      }
    } else {
      copy(source, dest);
    }
  });
