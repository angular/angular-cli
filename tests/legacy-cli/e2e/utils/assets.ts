import { join } from 'path';
import { chmod } from 'fs/promises';
import glob from 'glob';
import { getGlobalVariable } from './env';
import { relative, resolve } from 'path';
import { copyFile, writeFile } from './fs';
import { installWorkspacePackages } from './packages';
import { useBuiltPackages } from './project';

export function assetDir(assetName: string) {
  return join(__dirname, '../assets', assetName);
}

export function copyProjectAsset(assetName: string, to?: string) {
  const tempRoot = join(getGlobalVariable('projects-root'), 'test-project');
  const sourcePath = assetDir(assetName);
  const targetPath = join(tempRoot, to || assetName);

  return copyFile(sourcePath, targetPath);
}

export function copyAssets(assetName: string, to?: string) {
  const seed = +Date.now();
  const tempRoot = join(getGlobalVariable('projects-root'), 'assets', assetName + '-' + seed);
  const root = assetDir(assetName);

  return Promise.resolve()
    .then(() => {
      const allFiles = glob.sync('**/*', { dot: true, nodir: true, cwd: root });

      return allFiles.reduce((promise, filePath) => {
        const toPath =
          to !== undefined
            ? resolve(getGlobalVariable('projects-root'), 'test-project', to, filePath)
            : join(tempRoot, filePath);

        return promise
          .then(() => copyFile(join(root, filePath), toPath))
          .then(() => chmod(toPath, 0o777));
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
