import { join } from 'node:path';
import assert from 'node:assert';
import { expectFileToMatch, writeFile } from '../../../utils/fs';
import { execAndWaitForOutputToMatch, ng, noSilentNg, silentNg } from '../../../utils/process';
import { langTranslations, setupI18nConfig } from '../../i18n/setup';
import { findFreePort } from '../../../utils/network';
import { getGlobalVariable } from '../../../utils/env';
import { installWorkspacePackages, uninstallPackage } from '../../../utils/packages';
import { useSha } from '../../../utils/project';

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  // Setup project
  await setupI18nConfig();

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
  import { SsrComponent } from './ssr/ssr.component';
  import { SsgComponent } from './ssg/ssg.component';

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
      path: 'ssr',
      component: SsrComponent,
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
      path: '',
      renderMode: RenderMode.Prerender,
    },
    {
      path: 'ssg',
      renderMode: RenderMode.Prerender,
    },
    {
      path: '**',
      renderMode: RenderMode.Server,
    },
  ];
  `,
  );

  // Generate components for the above routes
  const componentNames: string[] = ['home', 'ssg', 'csr', 'ssr'];
  for (const componentName of componentNames) {
    await silentNg('generate', 'component', componentName);
  }

  await noSilentNg('build', '--output-mode=server', '--base-href=/base/');

  for (const { lang, outputPath } of langTranslations) {
    await expectFileToMatch(join(outputPath, 'index.html'), `<p id="locale">${lang}</p>`);
    await expectFileToMatch(join(outputPath, 'ssg/index.html'), `<p id="locale">${lang}</p>`);
  }

  // Tests responses
  const port = await spawnServer();
  const pathnamesToVerify = ['/ssr', '/ssg'];
  for (const { lang } of langTranslations) {
    for (const pathname of pathnamesToVerify) {
      const res = await fetch(`http://localhost:${port}/base/${lang}${pathname}`);
      const text = await res.text();

      assert.match(
        text,
        new RegExp(`<p id="locale">${lang}</p>`),
        `Response for '${lang}${pathname}': '<p id="locale">${lang}</p>' was not matched in content.`,
      );
    }
  }
}

async function spawnServer(): Promise<number> {
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
