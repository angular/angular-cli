import {join} from 'path';
import * as glob from 'glob';
import {getGlobalVariable} from './env';
import {relative} from 'path';
import {copyFile} from './fs';
import {updateJsonFile} from './project';
import {silentNpm} from './process';


export function assetDir(assetName: string) {
  return join(__dirname, '../assets', assetName);
}


export function copyAssets(assetName: string) {
  const tempRoot = join(getGlobalVariable('tmp-root'), 'assets', assetName);
  const root = assetDir(assetName);

  return Promise.resolve()
    .then(() => {
      const allFiles = glob.sync(join(root, '**/*'), { dot: true, nodir: true });

      return allFiles.reduce((promise, filePath) => {
        const relPath = relative(root, filePath);
        const toPath = join(tempRoot, relPath);

        return promise.then(() => copyFile(filePath, toPath));
      }, Promise.resolve());
    })
    .then(() => tempRoot);
}


export function createProjectFromAsset(assetName: string) {
  const packages = require('../../../lib/packages').packages;

  return Promise.resolve()
    .then(() => copyAssets(assetName))
    .then(dir => process.chdir(dir))
    .then(() => updateJsonFile('package.json', json => {
      if (!json['dependencies']) {
        json['dependencies'] = {};
      }
      if (!json['devDependencies']) {
        json['devDependencies'] = {};
      }

      for (const packageName of Object.keys(packages)) {
        if (json['dependencies'].hasOwnProperty(packageName)) {
          json['dependencies'][packageName] = packages[packageName].dist;
        } else if (json['devDependencies'].hasOwnProperty(packageName)) {
          json['devDependencies'][packageName] = packages[packageName].dist;
        }
      }
    }))
    .then(() => silentNpm('install'));
}
