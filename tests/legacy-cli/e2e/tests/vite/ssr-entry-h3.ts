import assert from 'node:assert';
import { setTimeout } from 'node:timers/promises';
import { replaceInFile, writeMultipleFiles } from '../../utils/fs';
import { ng, silentNg, waitForAnyProcessOutputToMatch } from '../../utils/process';
import { installPackage, installWorkspacePackages, uninstallPackage } from '../../utils/packages';
import { ngServe, useSha } from '../../utils/project';
import { getGlobalVariable, loopbackAddr } from '../../utils/env';

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
  await installPackage('h3@1');

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
    'src/server.ts': `
      import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
      import { createApp, createRouter, toWebHandler, defineEventHandler, toWebRequest } from 'h3';

      export function app() {
        const server = createApp();
        const router = createRouter();
        const angularAppEngine = new AngularAppEngine();

        router.use(
          '/api/**',
          defineEventHandler(() => ({ hello: 'foo' })),
        );

        router.use(
          '/**',
          defineEventHandler((event) => angularAppEngine.handle(toWebRequest(event))),
        );

        server.use(router);

        return server;
      }

      const server = app();

      export const reqHandler = createRequestHandler(toWebHandler(server));
    `,
  });

  await silentNg('generate', 'component', 'home');

  const port = await ngServe();

  // Verify the server is running and the API response is correct.
  await validateResponse('/main.js', /bootstrapApplication/);
  await validateResponse('/api/test', /foo/);
  await validateResponse('/home', /home works/);

  // Modify the home component and validate the change.
  await modifyFileAndWaitUntilUpdated(
    'src/app/home/home.component.html',
    'home works',
    'yay home works!!!',
    true,
  );
  await validateResponse('/api/test', /foo/);
  await validateResponse('/home', /yay home works/);

  // Modify the API response and validate the change.
  await modifyFileAndWaitUntilUpdated('src/server.ts', `{ hello: 'foo' }`, `{ hello: 'bar' }`);
  await validateResponse('/api/test', /bar/);
  await validateResponse('/home', /yay home works/);

  async function validateResponse(pathname: string, match: RegExp): Promise<void> {
    const response = await fetch(new URL(pathname, `http://${loopbackAddr}:${port}`));
    const text = await response.text();
    assert.match(text, match);
    assert.equal(response.status, 200);
  }
}

async function modifyFileAndWaitUntilUpdated(
  filePath: string,
  searchValue: string,
  replaceValue: string,
  hmr = false,
): Promise<void> {
  await Promise.all([
    waitForAnyProcessOutputToMatch(
      hmr ? /Component update sent to client/ : /Page reload sent to client/,
    ),
    setTimeout(100).then(() => replaceInFile(filePath, searchValue, replaceValue)),
  ]);
}
