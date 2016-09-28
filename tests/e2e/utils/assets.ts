import {join} from 'path';
import * as glob from 'glob';
import {getGlobalVariable} from './env';
import {relative} from 'path';
import {copyFile} from './fs';


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
