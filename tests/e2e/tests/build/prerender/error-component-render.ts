import { existsSync } from 'node:fs';
import assert, { match } from 'node:assert';
import { getGlobalVariable } from '../../../utils/env';
import { expectFileNotToExist, readFile, rimraf, writeMultipleFiles } from '../../../utils/fs';
import { installWorkspacePackages } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { useSha } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
  if (useWebpackBuilder) {
    return;
  }

  // Forcibly remove in case another test doesn't clean itself up.
  await rimraf('node_modules/@angular/ssr');
  await ng('add', '@angular/ssr', '--skip-confirmation');
  await useSha();
  await installWorkspacePackages();

  await writeMultipleFiles({
    'src/app/app.routes.ts': `
      import { Routes } from '@angular/router';
      import { Component } from '@angular/core';

      @Component({
        selector: 'app-home',
        standalone: true,
        template: '<p>home works!</p>',
      })
      export class HomeRoute {}

      @Component({
        selector: 'app-second',
        standalone: true,
        template: '<p>second works!</p>',
      })
      export class SecondRoute {
        constructor() {
          throw new Error('render failure');
        }
      }

      export const routes: Routes = [
        { path: '', component: HomeRoute },
        { path: 'second', component: SecondRoute },
      ];
    `,
    'src/app/app.routes.server.ts': `
      import { RenderMode, ServerRoute } from '@angular/ssr';

      export const serverRoutes: ServerRoute[] = [
        { path: 'second', renderMode: RenderMode.Prerender },
        { path: '**', renderMode: RenderMode.Prerender },
      ];
    `,
  });

  const { message } = await expectToFail(() => ng('build', '--output-mode=server'));

  match(message, /An error occurred while prerendering route '\/second'\./);

  await expectFileNotToExist('dist/test-project/browser/second/index.html');

  // prerendered-routes.json should only contain successfully prerendered routes if emitted
  const statsPath = 'dist/test-project/prerendered-routes.json';
  if (existsSync(statsPath)) {
    const stats = JSON.parse(await readFile(statsPath));
    assert.strictEqual(stats.routes['/second'], undefined);
  }
}
