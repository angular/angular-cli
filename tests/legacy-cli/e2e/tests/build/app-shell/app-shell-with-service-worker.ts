import { getGlobalVariable } from '../../../utils/env';
import { appendToFile, expectFileToMatch, writeFile } from '../../../utils/fs';
import { installPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

const snapshots = require('../../../ng-snapshot/package.json');

export default async function () {
  await appendToFile('src/app/app.component.html', '<router-outlet></router-outlet>');
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

  await writeFile(
    'e2e/app.e2e-spec.ts',
    `
    import { browser, by, element } from 'protractor';

    it('should have ngsw in normal state', () => {
      browser.get('/');
      // Wait for service worker to load.
      browser.sleep(2000);
      browser.waitForAngularEnabled(false);
      browser.get('/ngsw/state');
      // Should have updated, and be in normal state.
      expect(element(by.css('pre')).getText()).not.toContain('Last update check: never');
      expect(element(by.css('pre')).getText()).toContain('Driver state: NORMAL');
    });
  `,
  );

  await ng('run', 'test-project:app-shell:production');
  await expectFileToMatch('dist/test-project/browser/index.html', /app-shell works!/);

  await ng('e2e', '--configuration=production');
}
