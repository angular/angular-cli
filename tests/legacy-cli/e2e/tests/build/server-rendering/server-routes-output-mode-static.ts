import { join } from 'node:path';
import { existsSync } from 'node:fs';
import assert from 'node:assert';
import {
  expectFileNotToExist,
  expectFileToMatch,
  replaceInFile,
  writeFile,
} from '../../../utils/fs';
import { ng, noSilentNg, silentNg } from '../../../utils/process';
import { installWorkspacePackages, uninstallPackage } from '../../../utils/packages';
import { useSha } from '../../../utils/project';
import { getGlobalVariable } from '../../../utils/env';
import { expectToFail } from '../../../utils/utils';

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

  // Add routes
  await writeFile(
    'src/app/app.routes.ts',
    `
  import { Routes } from '@angular/router';
  import { HomeComponent } from './home/home.component';
  import { SsgComponent } from './ssg/ssg.component';
  import { SsgWithParamsComponent } from './ssg-with-params/ssg-with-params.component';

  export const routes: Routes = [
    {
      path: '',
      component: HomeComponent,
    },
    {
      path: 'ssg',
      component: SsgComponent,
    },
    {
      path: 'ssg-redirect',
      redirectTo: 'ssg'
    },
    {
      path: 'ssg/:id',
      component: SsgWithParamsComponent,
    },
    {
      path: '**',
      component: HomeComponent,
    },
  ];
  `,
  );

  // Add server routing
  await writeFile(
    'src/app/app.routes.server.ts',
    `
  import { RenderMode, ServerRoute } from '@angular/ssr';

  export const serverRoutes: ServerRoute[] = [
    {
      path: 'ssg/:id',
      renderMode: RenderMode.Prerender,
      getPrerenderParams: async() => [{id: 'one'}, {id: 'two'}],
    },
    {
      path: '**',
      renderMode: RenderMode.Server,
    },
  ];
  `,
  );

  // Generate components for the above routes
  const componentNames: string[] = ['home', 'ssg', 'ssg-with-params'];

  for (const componentName of componentNames) {
    await silentNg('generate', 'component', componentName);
  }

  // Should error as above we set `RenderMode.Server`
  const { message: errorMessage } = await expectToFail(() =>
    noSilentNg('build', '--output-mode=static'),
  );
  assert.match(
    errorMessage,
    new RegExp(
      `Route '/' is configured with server render mode, but the build 'outputMode' is set to 'static'.`,
    ),
  );

  // Fix the error
  await replaceInFile('src/app/app.routes.server.ts', 'RenderMode.Server', 'RenderMode.Prerender');
  await noSilentNg('build', '--output-mode=static');

  const expects: Record<string, RegExp | string> = {
    'index.html': /ng-server-context="ssg".+home works!/,
    'ssg/index.html': /ng-server-context="ssg".+ssg works!/,
    'ssg/one/index.html': /ng-server-context="ssg".+ssg-with-params works!/,
    'ssg/two/index.html': /ng-server-context="ssg".+ssg-with-params works!/,
    // When static redirects as generated as meta tags.
    'ssg-redirect/index.html': '<meta http-equiv="refresh" content="0; url=/ssg">',
  };

  for (const [filePath, fileMatch] of Object.entries(expects)) {
    await expectFileToMatch(join('dist/test-project/browser', filePath), fileMatch);
  }

  // Check that server directory does not exist
  assert(
    !existsSync('dist/test-project/server'),
    'Server directory should not exist when output-mode is static',
  );

  // Should not prerender the catch all
  await expectFileNotToExist(join('dist/test-project/browser/**/index.html'));
}
