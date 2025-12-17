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
  await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');
  await useSha();
  await installWorkspacePackages();

  // Add routes
  await writeFile(
    'src/app/app.routes.ts',
    `
  import { Routes } from '@angular/router';
  import { Home } from './home/home';
  import { Ssr } from './ssr/ssr';
  import { Ssg } from './ssg/ssg';

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
      path: 'ssr',
      component: Ssr,
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
  const componentNames: string[] = ['home', 'ssg', 'ssr'];
  for (const componentName of componentNames) {
    await silentNg('generate', 'component', componentName);
  }

  await noSilentNg('build', '--output-mode=server');

  const expects: Record<string, string> = {
    'index.html': 'home works!',
    'ssg/index.html': 'ssg works!',
  };

  for (const { lang, outputPath } of langTranslations) {
    for (const [filePath, fileMatch] of Object.entries(expects)) {
      await expectFileToMatch(join(outputPath, filePath), `<p id="locale">${lang}</p>`);
      await expectFileToMatch(join(outputPath, filePath), fileMatch);
    }
  }

  // Tests responses
  const port = await spawnServer();
  const pathname = '/ssr';

  // We run the tests twice to ensure that the locale ID is set correctly.
  for (const iteration of [1, 2]) {
    for (const { lang, translation } of langTranslations) {
      const res = await fetch(`http://localhost:${port}/${lang}${pathname}`);
      const text = await res.text();

      for (const match of [`<p id="date">${translation.date}</p>`, `<p id="locale">${lang}</p>`]) {
        assert.match(
          text,
          new RegExp(match),
          `Response for '${lang}${pathname}': '${match}' was not matched in content. Iteration: ${iteration}.`,
        );
      }
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
      ...process.env,
      'PORT': String(port),
    },
  );

  return port;
}
