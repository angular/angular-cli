import { getGlobalVariable } from '../../utils/env';
import { writeFile } from '../../utils/fs';
import { findFreePort } from '../../utils/network';
import { installWorkspacePackages, uninstallPackage } from '../../utils/packages';
import { execAndWaitForOutputToMatch, ng } from '../../utils/process';
import { updateJsonFile, useSha } from '../../utils/project';
import assert from 'node:assert';

export async function spawnServer(): Promise<number> {
  const port = await findFreePort();
  await execAndWaitForOutputToMatch(
    'npm',
    ['run', 'serve:ssr:test-project'],
    /Node Express server listening on/,
    {
      'PORT': String(port),
    },
  );

  return port;
}

export async function setupProjectWithSSRAppEngine(): Promise<void> {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  // Forcibly remove in case another test doesn't clean itself up.
  await uninstallPackage('@angular/ssr');
  await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');

  await useSha();
  await installWorkspacePackages();

  // Add server config
  await writeFile(
    'src/app/app.config.server.ts',
    `
    import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
    import { provideServerRendering } from '@angular/platform-server';
    import { provideServerRoutesConfig } from '@angular/ssr';
    import { routes } from './app.routes.server';
    import { appConfig } from './app.config';

    const serverConfig: ApplicationConfig = {
      providers: [
        provideServerRoutesConfig(routes),
        provideServerRendering()
      ]
    };

    export const config = mergeApplicationConfig(appConfig, serverConfig);
  `,
  );

  // Update server.ts
  await writeFile(
    'server.ts',
    `
  import { AngularNodeAppEngine, writeResponseToNodeResponse } from '@angular/ssr/node';
  import express from 'express';
  import { fileURLToPath } from 'node:url';
  import { dirname, resolve } from 'node:path';

  // The Express app is exported so that it can be used by serverless Functions.
  export function app(): express.Express {
    const server = express();
    const serverDistFolder = dirname(fileURLToPath(import.meta.url));
    const browserDistFolder = resolve(serverDistFolder, '../browser');

    const angularNodeAppEngine = new AngularNodeAppEngine();

    server.set('view engine', 'html');
    server.set('views', browserDistFolder);

    server.get('**', express.static(browserDistFolder, {
      maxAge: '1y',
      index: 'index.html',
      setHeaders: (res, path) => {
        const headers = angularNodeAppEngine.getPrerenderHeaders(res.req);
        for (const [key, value] of headers) {
          res.setHeader(key, value);
        }
      }
    }));

    // All regular routes use the Angular engine
    server.get('**', (req, res, next) => {
      angularNodeAppEngine
        .render(req)
        .then((response) => {
          if (response) {
            return writeResponseToNodeResponse(response, res);
          }

          return next();
        })
        .catch((err) => next(err));
    });

    return server;
  }

  function run(): void {
    const port = process.env['PORT'] || 4000;

    // Start up the Node server
    const server = app();
    server.listen(port, () => {
      console.log(\`Node Express server listening on http://localhost:\${port}\`);
    });
  }

  run();
`,
  );

  // Update angular.json
  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    const options = appArchitect.build.options;

    delete options.prerender;
    delete options.appShell;
  });
}
