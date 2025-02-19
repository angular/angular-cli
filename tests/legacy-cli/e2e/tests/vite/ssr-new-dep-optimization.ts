import assert from 'node:assert';
import {
  execAndWaitForOutputToMatch,
  ng,
  waitForAnyProcessOutputToMatch,
} from '../../utils/process';
import { installWorkspacePackages, uninstallPackage } from '../../utils/packages';
import { useSha } from '../../utils/project';
import { getGlobalVariable, loopbackAddr } from '../../utils/env';
import { readFile, writeFile } from '../../utils/fs';
import { findFreePort } from '../../utils/network';

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  // Enable caching to test real development workflow.
  await ng('cache', 'clean');
  await ng('cache', 'on');

  // Forcibly remove in case another test doesn't clean itself up.
  await uninstallPackage('@angular/ssr');
  await ng('add', '@angular/ssr', '--server-routing', '--skip-confirmation', '--skip-install');
  await useSha();
  await installWorkspacePackages();

  const port = await findFreePort();
  await execAndWaitForOutputToMatch(
    'ng',
    ['serve', '--port', port.toString()],
    /Application bundle generation complete/,
    { CI: '0', NO_COLOR: 'true' },
  );
  await validateResponse('/', /Hello,/);

  await Promise.all([
    waitForAnyProcessOutputToMatch(
      /new dependencies optimized: @angular\/platform-browser\/animations\/async/,
      6000,
    ),
    writeFile(
      'src/app/app.config.ts',
      `
      import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
      ${(await readFile('src/app/app.config.ts')).replace('provideRouter(routes),', 'provideAnimationsAsync(), provideRouter(routes),')}
    `,
    ),
  ]);

  // Verify the app still works.
  await validateResponse('/', /Hello,/);

  async function validateResponse(pathname: string, match: RegExp): Promise<void> {
    const response = await fetch(new URL(pathname, `http://${loopbackAddr}:${port}`));
    const text = await response.text();
    assert.match(text, match);
  }
}
