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
  await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');
  await useSha();
  await installWorkspacePackages();

  // Add routes
  await writeFile(
    'src/app/app.routes.ts',
    `
  import { inject } from '@angular/core';
  import { Routes, Router } from '@angular/router';
  import { Home } from './home/home';
  import { Ssg } from './ssg/ssg';
  import { SsgWithParams } from './ssg-with-params/ssg-with-params';

  export const routes: Routes = [
    {
      path: '',
      component: Home,
    },
    {
      path: 'ssg',
      component: Ssg,
    },
    {
      path: 'ssg-redirect',
      redirectTo: 'ssg'
    },
    {
      path: 'ssg-redirect-external',
      component: Ssg,
    },
    {
      path: 'ssg-redirect-unsafe-url',
      component: Ssg,
    },
    {
      path: 'ssg-redirect-via-guard',
      canActivate: [() => {
        return inject(Router).createUrlTree(['ssg'], { queryParams: { foo: 'bar' }})
      }],
    },
    {
      path: 'ssg/:id',
      component: SsgWithParams,
    },
    {
      path: '**',
      component: Home,
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
      path: 'ssg-redirect-external',
      renderMode: RenderMode.Prerender,
      headers: { Location: 'https://example.com/docs?from=ssg&next=/ssg' },
    },
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

  const expects: Record<string, RegExp | string | (RegExp | string)[]> = {
    'index.html': /ng-server-context="ssg".+home works!/,
    'ssg/index.html': /ng-server-context="ssg".+ssg works!/,
    'ssg/one/index.html': /ng-server-context="ssg".+ssg-with-params works!/,
    'ssg/two/index.html': /ng-server-context="ssg".+ssg-with-params works!/,
    // When static redirects are generated as meta tags.
    'ssg-redirect/index.html': '<meta http-equiv="refresh" content="0; url=/ssg">',
    'ssg-redirect-external/index.html': [
      '<meta http-equiv="refresh" content="0; url=https://example.com/docs?from=ssg&amp;next=/ssg">',
      '<a href="https://example.com/docs?from=ssg&amp;next=/ssg">https://example.com/docs?from=ssg&amp;next=/ssg</a>',
    ],
    'ssg-redirect-via-guard/index.html':
      '<meta http-equiv="refresh" content="0; url=/ssg?foo=bar">',
  };

  for (const [filePath, fileMatches] of Object.entries(expects)) {
    for (const fileMatch of Array.isArray(fileMatches) ? fileMatches : [fileMatches]) {
      await expectFileToMatch(join('dist/test-project/browser', filePath), fileMatch);
    }
  }

  await replaceInFile(
    'src/app/app.routes.ts',
    `redirectTo: 'ssg'`,
    `redirectTo: '/ssg"><script>alert(1)</script>&q=x'`,
  );

  const { message: unsafeRedirectToErrorMessage } = await expectToFail(() =>
    noSilentNg('build', '--output-mode=static'),
  );
  assert.match(unsafeRedirectToErrorMessage, /Invalid 'redirectTo' for route 'ssg-redirect'/);
  assert.match(
    unsafeRedirectToErrorMessage,
    /contains characters that are not allowed in a statically emitted URL/,
  );

  await replaceInFile(
    'src/app/app.routes.ts',
    `redirectTo: '/ssg"><script>alert(1)</script>&q=x'`,
    `redirectTo: 'ssg'`,
  );

  await replaceInFile(
    'src/app/app.routes.server.ts',
    `{
      path: '**',
      renderMode: RenderMode.Prerender,
    },`,
    `{
      path: 'ssg-redirect-unsafe-url',
      renderMode: RenderMode.Prerender,
      headers: { Location: 'javascript:alert(1)' },
    },
    {
      path: '**',
      renderMode: RenderMode.Prerender,
    },`,
  );

  const { message: unsafeProtocolErrorMessage } = await expectToFail(() =>
    noSilentNg('build', '--output-mode=static'),
  );
  assert.match(
    unsafeProtocolErrorMessage,
    /Invalid 'headers\.Location' for route 'ssg-redirect-unsafe-url'/,
  );
  assert.match(unsafeProtocolErrorMessage, /the protocol 'javascript:' is not allowed/);

  await replaceInFile(
    'src/app/app.routes.server.ts',
    `headers: { Location: 'javascript:alert(1)' },`,
    `headers: { Location: '/\\\\evil.com' },`,
  );

  const { message: backslashRedirectErrorMessage } = await expectToFail(() =>
    noSilentNg('build', '--output-mode=static'),
  );
  assert.match(
    backslashRedirectErrorMessage,
    /Invalid 'headers\.Location' for route 'ssg-redirect-unsafe-url'/,
  );
  assert.match(
    backslashRedirectErrorMessage,
    /contains characters that are not allowed in a statically emitted URL/,
  );

  // Check that server directory does not exist
  assert(
    !existsSync('dist/test-project/server'),
    'Server directory should not exist when output-mode is static',
  );

  // Should not prerender the catch all
  await expectFileNotToExist(join('dist/test-project/browser/**/index.html'));
}
