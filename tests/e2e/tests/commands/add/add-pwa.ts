import assert from 'node:assert/strict';
import { getGlobalVariable } from '../../../utils/env';
import { expectFileToExist, readFile, rimraf } from '../../../utils/fs';
import { installWorkspacePackages } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

const snapshots = require('../../../ng-snapshot/package.json');

export default async function () {
  // forcibly remove in case another test doesn't clean itself up
  await rimraf('node_modules/@angular/pwa');
  await ng('add', '@angular/pwa', '--skip-confirmation');
  await expectFileToExist('public/manifest.webmanifest');

  // Angular PWA doesn't install as a dependency
  const { dependencies, devDependencies } = JSON.parse(await readFile('package.json'));
  const hasPWADep = Object.keys({ ...dependencies, ...devDependencies }).some(
    (d) => d === '@angular/pwa',
  );
  assert.ok(!hasPWADep, `Expected 'package.json' not to contain a dependency on '@angular/pwa'.`);

  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];
  if (isSnapshotBuild) {
    let needInstall = false;
    await updateJsonFile('package.json', (packageJson) => {
      const dependencies = packageJson['dependencies'];
      // Iterate over all of the packages to update them to the snapshot version.
      for (const [name, version] of Object.entries(snapshots.dependencies)) {
        if (name in dependencies && dependencies[name] !== version) {
          dependencies[name] = version;
          needInstall = true;
        }
      }
    });

    if (needInstall) {
      await installWorkspacePackages();
    }
  }

  // It should generate a SW configuration file (`ngsw.json`).
  const ngswPath = 'dist/test-project/browser/ngsw.json';

  await ng('build');
  await expectFileToExist(ngswPath);

  // It should correctly generate assetGroups and include at least one URL in each group.
  const ngswJson = JSON.parse(await readFile(ngswPath));
  // @ts-ignore
  const assetGroups: any[] = ngswJson.assetGroups.map(({ name, urls }) => ({
    name,
    urlCount: urls.length,
  }));
  const emptyAssetGroups = assetGroups.filter(({ urlCount }) => urlCount === 0);

  assert.ok(assetGroups.length > 0, "Expected 'ngsw.json' to contain at least one asset-group.");
  assert.ok(
    emptyAssetGroups.length === 0,
    'Expected all asset-groups to contain at least one URL, but the following groups are empty: ' +
      emptyAssetGroups.map(({ name }) => name).join(', '),
  );
}
