import assert from 'node:assert';
import { setTimeout } from 'node:timers/promises';
import { replaceInFile, writeMultipleFiles } from '../../utils/fs';
import { ng, silentNg, waitForAnyProcessOutputToMatch } from '../../utils/process';
import { installPackage, installWorkspacePackages, uninstallPackage } from '../../utils/packages';
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
  await installPackage('fastify@5');

  await writeMultipleFiles({
    // Replace the template of app.component.ng.html as it makes it harder to debug
    'src/app/app.component.ng.html': '<router-outlet />',
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
      import { AngularNodeAppEngine, writeResponseToNodeResponse, isMainModule, createNodeRequestHandler } from '@angular/ssr/node';
      import fastify from 'fastify';

      export function app() {
        const server = fastify();
        const angularNodeAppEngine = new AngularNodeAppEngine();
        server.get('/api/*', (req, reply) => reply.send({ hello: 'foo' }));
        server.get('*', async (req, reply) => {
          try {
            const response = await angularNodeAppEngine.handle(req.raw);
            if (response) {
              await writeResponseToNodeResponse(response, reply.raw);
            } else {
              reply.callNotFound();
            }
          } catch (error) {
            reply.send(error);
          }
        });

        return server;
      }

      const server = app();
      if (isMainModule(import.meta.url)) {
        const port = +(process.env['PORT'] || 4000);
        server.listen({ port }, () => {
          console.log(\`Fastify server listening on http://localhost:\${port}\`);
        });
      }

      export const reqHandler = createNodeRequestHandler(async (req, res) => {
        await server.ready();
        server.server.emit('request', req, res);
      });
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
    'src/app/home/home.component.ng.html',
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
    const response = await fetch(new URL(pathname, `http://localhost:${port}`));
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
