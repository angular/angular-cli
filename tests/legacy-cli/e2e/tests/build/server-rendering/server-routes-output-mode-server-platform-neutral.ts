import { join } from 'node:path';
import { existsSync } from 'node:fs';
import assert from 'node:assert';
import { expectFileToMatch, writeMultipleFiles } from '../../../utils/fs';
import { execAndWaitForOutputToMatch, ng, noSilentNg, silentNg } from '../../../utils/process';
import {
  installPackage,
  installWorkspacePackages,
  uninstallPackage,
} from '../../../utils/packages';
import { updateJsonFile, useSha } from '../../../utils/project';
import { getGlobalVariable } from '../../../utils/env';
import { findFreePort } from '../../../utils/network';
import { readFile } from 'node:fs/promises';

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
      import { SsrComponent } from './ssr/ssr.component';
      import { SsgWithParamsComponent } from './ssg-with-params/ssg-with-params.component';

      export const routes: Routes = [
        {
          path: '',
          component: HomeComponent,
        },
        {
          path: 'ssr',
          component: SsrComponent,
        },
        {
          path: 'ssg/:id',
          component: SsgWithParamsComponent,
        },
      ];
    `,
    'src/app/app.routes.server.ts': `
      import { RenderMode, ServerRoute } from '@angular/ssr';

      export const serverRoutes: ServerRoute[] = [
        {
          path: 'ssg/:id',
          renderMode: RenderMode.Prerender,
          getPrerenderParams: async() => [{id: 'one'}, {id: 'two'}],
        },
        {
          path: 'ssr',
          renderMode: RenderMode.Server,
        },
        {
          path: '**',
          renderMode: RenderMode.Prerender,
        },
      ];
    `,
    'src/server.ts': `
      import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
      import { createApp, createRouter, toWebHandler, defineEventHandler, toWebRequest } from 'h3';

      export const app = createApp();
      const router = createRouter();
      const angularAppEngine = new AngularAppEngine();

      router.use(
        '/**',
        defineEventHandler((event) => angularAppEngine.handle(toWebRequest(event))),
      );

      app.use(router);
      export const reqHandler = createRequestHandler(toWebHandler(app));
    `,
  });
  // Generate components for the above routes
  const componentNames: string[] = ['home', 'ssr', 'ssg-with-params'];

  for (const componentName of componentNames) {
    await silentNg('generate', 'component', componentName);
  }

  await updateJsonFile('angular.json', (json) => {
    const buildTarget = json['projects']['test-project']['architect']['build'];
    const options = buildTarget['options'];
    options['ssr']['experimentalPlatform'] = 'neutral';
    options['outputMode'] = 'server';
  });

  await noSilentNg('build');

  // Valid SSG pages work
  const expects: Record<string, string> = {
    'index.html': 'home works!',
    'ssg/one/index.html': 'ssg-with-params works!',
    'ssg/two/index.html': 'ssg-with-params works!',
  };

  for (const [filePath, fileMatch] of Object.entries(expects)) {
    await expectFileToMatch(join('dist/test-project/browser', filePath), fileMatch);
  }

  const filesDoNotExist: string[] = ['csr/index.html', 'ssr/index.html', 'redirect/index.html'];
  for (const filePath of filesDoNotExist) {
    const file = join('dist/test-project/browser', filePath);
    assert.equal(existsSync(file), false, `Expected '${file}' to not exist.`);
  }

  const port = await findFreePort();
  await execAndWaitForOutputToMatch(
    'npx',
    ['-y', 'listhen@1', './dist/test-project/server/server.mjs', `--port=${port}`],
    /Server initialized/,
  );

  const res = await fetch(`http://localhost:${port}/ssr`);
  const text = await res.text();
  assert.match(text, new RegExp('ssr works!'));
}
