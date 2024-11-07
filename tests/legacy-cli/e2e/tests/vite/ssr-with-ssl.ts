import assert from 'node:assert';
import { writeMultipleFiles } from '../../utils/fs';
import { ng, silentNg } from '../../utils/process';
import { installWorkspacePackages, uninstallPackage } from '../../utils/packages';
import { ngServe, useSha } from '../../utils/project';
import { getGlobalVariable } from '../../utils/env';

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  // Forcibly remove in case another test doesn't clean itself up.
  await uninstallPackage('@angular/ssr');
  await ng('add', '@angular/ssr', '--server-routing', '--skip-confirmation', '--skip-install');
  await useSha();
  await installWorkspacePackages();

  await writeMultipleFiles({
    // Replace the template of app.component.html as it makes it harder to debug
    'src/app/app.component.html': '<router-outlet />',
    'src/app/app.routes.ts': `
      import { Routes } from '@angular/router';
      import { HomeComponent } from './home/home.component';

      export const routes: Routes = [
        { path: 'home', component: HomeComponent }
      ];
    `,
    'src/app/app.routes.server.ts': `
      import { RenderMode, ServerRoute } from '@angular/ssr';

      export const serverRoutes: ServerRoute[] = [
        { path: '**', renderMode: RenderMode.Server }
      ];
    `,
  });

  await silentNg('generate', 'component', 'home');

  const port = await ngServe('--ssl');

  // Verify the server is running and the API response is correct.
  await validateResponse('/main.js', /bootstrapApplication/);
  await validateResponse('/home', /home works/);

  async function validateResponse(pathname: string, match: RegExp): Promise<void> {
    try {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const response = await fetch(new URL(pathname, `https://localhost:${port}`));
      const text = await response.text();
      assert.match(text, match);
      assert.equal(response.status, 200);
    } finally {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    }
  }
}
