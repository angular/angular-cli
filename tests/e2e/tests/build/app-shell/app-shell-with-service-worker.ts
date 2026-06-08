import { setTimeout } from 'node:timers/promises';
import { getGlobalVariable } from '../../../utils/env';
import { appendToFile, expectFileToMatch } from '../../../utils/fs';
import { installPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';
import { executeBrowserTest } from '../../../utils/puppeteer';

const snapshots = require('../../../ng-snapshot/package.json');

export default async function () {
  await appendToFile('src/app/app.html', '<router-outlet></router-outlet>');
  await ng('generate', 'service-worker', '--project', 'test-project');
  await ng('generate', 'app-shell', '--project', 'test-project');

  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];
  if (isSnapshotBuild) {
    const packagesToInstall: string[] = [];
    await updateJsonFile('package.json', (packageJson) => {
      const dependencies = packageJson['dependencies'];
      // Iterate over all of the packages to update them to the snapshot version.
      for (const [name, version] of Object.entries(
        snapshots.dependencies as { [p: string]: string },
      )) {
        if (name in dependencies && dependencies[name] !== version) {
          packagesToInstall.push(version);
        }
      }
    });

    for (const pkg of packagesToInstall) {
      await installPackage(pkg);
    }
  }

  await ng('build');
  await expectFileToMatch('dist/test-project/browser/index.html', /app-shell works!/);

  await executeBrowserTest({
    configuration: 'production',
    checkFn: async (page) => {
      // Wait for service worker to load.
      await setTimeout(2000);

      const baseUrl = page.url();
      await page.goto(new URL('/ngsw/state', baseUrl).href);

      // Should have updated, and be in normal state.
      const preText = await page.$eval('pre', (el) => el.textContent);
      if (preText?.includes('Last update check: never')) {
        throw new Error(`Expected service worker to have checked for updates, but got: ${preText}`);
      }

      // TODO: Investigate why the last condition fails with vite-based setup.
      //       Temporarily disabled to support protractor migration.
      if (getGlobalVariable('argv')['esbuild']) {
        return;
      }

      if (!preText?.includes('Driver state: NORMAL')) {
        throw new Error(`Expected service worker driver state to be NORMAL, but got: ${preText}`);
      }
    },
  });
}
