import assert, { match } from 'node:assert';
import { readFile, writeMultipleFiles } from '../../../utils/fs';
import { ng, noSilentNg, silentNg } from '../../../utils/process';
import { getGlobalVariable } from '../../../utils/env';
import { installWorkspacePackages, uninstallPackage } from '../../../utils/packages';
import { useSha } from '../../../utils/project';

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
    // Add asset
    'public/media.json': JSON.stringify({ dataFromAssets: true }),
    // Update component to do an HTTP call to asset and API.
    'src/app/app.component.ts': `
    import { Component, inject } from '@angular/core';
    import { JsonPipe } from '@angular/common';
    import { RouterOutlet } from '@angular/router';
    import { HttpClient } from '@angular/common/http';

    @Component({
      selector: 'app-root',
      standalone: true,
      imports: [JsonPipe, RouterOutlet],
      template: \`
        <p>{{ assetsData | json }}</p>
        <p>{{ apiData | json }}</p>
        <router-outlet></router-outlet>
      \`,
    })
    export class AppComponent {
      assetsData: any;
      apiData: any;

      constructor() {
        const http = inject(HttpClient);

        http.get('/media.json').toPromise().then((d) => {
          this.assetsData = d;
        });

        http.get('/api').toPromise().then((d) => {
          this.apiData = d;
        });
      }
    }
    `,
    // Add http client and route
    'src/app/app.config.ts': `
      import { ApplicationConfig } from '@angular/core';
      import { provideRouter } from '@angular/router';

      import { HomeComponent } from './home/home.component';
      import { provideClientHydration } from '@angular/platform-browser';
      import { provideHttpClient, withFetch } from '@angular/common/http';

      export const appConfig: ApplicationConfig = {
        providers: [
          provideRouter([{
            path: 'home',
            component: HomeComponent,
          }]),
          provideClientHydration(),
          provideHttpClient(withFetch()),
        ],
      };
    `,
    'src/server.ts': `
      import { AngularNodeAppEngine, writeResponseToNodeResponse, isMainModule, createNodeRequestHandler } from '@angular/ssr/node';
      import express from 'express';
      import { fileURLToPath } from 'node:url';
      import { dirname, resolve } from 'node:path';

      export function app(): express.Express {
        const server = express();
        const serverDistFolder = dirname(fileURLToPath(import.meta.url));
        const browserDistFolder = resolve(serverDistFolder, '../browser');
        const angularNodeAppEngine = new AngularNodeAppEngine();

        server.get('/api', (req, res) => res.json({ dataFromAPI: true }));

        server.get('**', express.static(browserDistFolder, {
          maxAge: '1y',
          index: 'index.html'
        }));

        server.get('**', (req, res, next) => {
          angularNodeAppEngine.render(req)
            .then((response) => response ? writeResponseToNodeResponse(response, res) : next())
            .catch(next);
        });
        return server;
      }

      const server = app();

      if (isMainModule(import.meta.url)) {
        const port = process.env['PORT'] || 4000;
        server.listen(port, () => {
          console.log(\`Node Express server listening on http://localhost:\${port}\`);
        });
      }

      export const reqHandler = createNodeRequestHandler(server);
    `,
  });

  await silentNg('generate', 'component', 'home');

  await noSilentNg('build', '--output-mode=static');

  const contents = await readFile('dist/test-project/browser/home/index.html');
  match(contents, /<p>{[\S\s]*"dataFromAssets":[\s\S]*true[\S\s]*}<\/p>/);
  match(contents, /<p>{[\S\s]*"dataFromAPI":[\s\S]*true[\S\s]*}<\/p>/);
  match(contents, /home works!/);
}
