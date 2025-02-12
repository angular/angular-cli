import assert from 'node:assert';
import { ng } from '../../utils/process';
import { installWorkspacePackages, uninstallPackage } from '../../utils/packages';
import { ngServe, useSha } from '../../utils/project';
import { getGlobalVariable } from '../../utils/env';

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

  const port = await ngServe();

  // Verify the server is running and the API response is correct.
  await validateResponse('/main.js', /bootstrapApplication/);
  await validateResponse('/', /Hello,/);
  await validateResponse('/unknown', /Cannot GET/, 404);

  async function validateResponse(pathname: string, match: RegExp, status = 200): Promise<void> {
    const response = await fetch(new URL(pathname, `http://localhost:${port}`));
    const text = await response.text();
    assert.match(text, match);
    assert.equal(response.status, status);
  }
}
