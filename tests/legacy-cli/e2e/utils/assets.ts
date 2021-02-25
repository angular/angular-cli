import { join } from 'path';
import * as glob from 'glob';
import { getGlobalVariable } from './env';
import { relative, resolve } from 'path';
import { copyFile, writeFile } from './fs';
import { installWorkspacePackages } from './packages';
import { useBuiltPackages } from './project';

export function assetDir(assetName: string) {
  return join(__dirname, '../assets', assetName);
}

export function copyProjectAsset(assetName: string, to?: string) {
  const tempRoot = join(getGlobalVariable('tmp-root'), 'test-project');
  const sourcePath = assetDir(assetName);
  const targetPath = join(tempRoot, to || assetName);

  return copyFile(sourcePath, targetPath);
}

export function copyAssets(assetName: string, to?: string) {
  const seed = +Date.now();
  const tempRoot = join(getGlobalVariable('tmp-root'), 'assets', assetName + '-' + seed);
  const root = assetDir(assetName);

  return Promise.resolve()
    .then(() => {
      const allFiles = glob.sync(join(root, '**/*'), { dot: true, nodir: true });

      return allFiles.reduce((promise, filePath) => {
        const relPath = relative(root, filePath);
        const toPath =
          to !== undefined
            ? resolve(getGlobalVariable('tmp-root'), 'test-project', to, relPath)
            : join(tempRoot, relPath);

        return promise.then(() => copyFile(filePath, toPath));
      }, Promise.resolve());
    })
    .then(() => tempRoot);
}

export async function createProjectFromAsset(
  assetName: string,
  useNpmPackages = false,
  skipInstall = false,
) {
  const dir = await copyAssets(assetName);
  process.chdir(dir);
  if (!useNpmPackages) {
    await useBuiltPackages();
    if (!getGlobalVariable('ci')) {
      const testRegistry = getGlobalVariable('package-registry');
      await writeFile('.npmrc', `registry=${testRegistry}`);
    }
  }

  if (!skipInstall) {
    await installWorkspacePackages();
  }

  return dir;
}
