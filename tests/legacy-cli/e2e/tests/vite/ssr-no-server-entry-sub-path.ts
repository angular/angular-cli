import assert from 'node:assert';
import {
  execAndWaitForOutputToMatch,
  ng,
  silentNg,
  waitForAnyProcessOutputToMatch,
} from '../../utils/process';
import { installWorkspacePackages, uninstallPackage } from '../../utils/packages';
import { useSha } from '../../utils/project';
import { getGlobalVariable, loopbackAddr } from '../../utils/env';
import { findFreePort } from '../../utils/network';
import { writeFile } from '../../utils/fs';

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  // Forcibly remove in case another test doesn't clean itself up.
  await uninstallPackage('@angular/ssr');
  await ng('add', '@angular/ssr', '--no-server-routing', '--skip-confirmation', '--skip-install');
  await useSha();
  await installWorkspacePackages();

  await silentNg('generate', 'component', 'home');
  await writeFile(
    'src/app/app.routes.ts',
    `
    import { Routes } from '@angular/router';
    import {HomeComponent} from './home/home.component';

    export const routes: Routes = [{
      path: 'sub/home',
      component: HomeComponent
    }];
    `,
  );

  const port = await findFreePort();
  await execAndWaitForOutputToMatch(
    'ng',
    ['serve', '--port', `${port}`, '--host', '0.0.0.0'],
    /complete/,
    {
      NO_COLOR: 'true',
    },
  );

  const [, response] = await Promise.all([
    assert.rejects(
      waitForAnyProcessOutputToMatch(/Pre-transform error: Failed to load url/, 8_000),
    ),
    fetch(`http://${loopbackAddr}:${port}/sub/home`),
  ]);

  assert(response.ok, `Expected 'response.ok' to be 'true'.`);
}
