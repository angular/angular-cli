import { join } from 'node:path';
import { expectFileNotToExist, expectFileToMatch, replaceInFile, writeFile } from '../../utils/fs';
import { noSilentNg, silentNg } from '../../utils/process';
import { setupProjectWithSSRAppEngine } from './setup';
import { existsSync } from 'node:fs';
import { expectToFail } from '../../utils/utils';
import assert from 'node:assert';

export default async function () {
  // Setup project
  await setupProjectWithSSRAppEngine();

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

  export const routes: ServerRoute[] = [
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

  const expects: Record<string, string> = {
    'index.html': 'home works!',
    'ssg/index.html': 'ssg works!',
    'ssg/one/index.html': 'ssg-with-params works!',
    'ssg/two/index.html': 'ssg-with-params works!',
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
