import assert from 'node:assert';
import { ng } from '../../utils/process';
import { replaceInFile } from '../../utils/fs';
import { installWorkspacePackages, uninstallPackage } from '../../utils/packages';
import { ngServe, updateJsonFile, useSha } from '../../utils/project';
import { getGlobalVariable } from '../../utils/env';

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  await uninstallPackage('@angular/ssr');
  await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');
  await useSha();
  await installWorkspacePackages();

  await updateJsonFile('angular.json', (json) => {
    json.projects['test-project'].architect.build.options['baseHref'] = '/base';
  });

  await replaceInFile(
    'src/server.ts',
    /express\(\);/,
    `express();

    app.use('/ping', (req, res) => {
      return res.json({ pong: true });
    });`,
  );

  const port = await ngServe();

  // Angular application and bundled should be affected by baseHref
  await matchResponse(`http://localhost:${port}/base`, /ng-server-context/);
  await matchResponse(`http://localhost:${port}/base/main.js`, /App/);

  // Server endpoint should not be affected by baseHref
  await matchResponse(`http://localhost:${port}/ping`, /pong/);
}

async function matchResponse(url: string, match: RegExp): Promise<void> {
  const response = await fetch(url);
  const text = await response.text();

  assert.match(text, match);
}
