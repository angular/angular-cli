import { join } from 'node:path';
import assert from 'node:assert';
import { expectFileToMatch, writeFile } from '../../utils/fs';
import { noSilentNg, silentNg } from '../../utils/process';
import { setupProjectWithSSRAppEngine, spawnServer } from './setup';
import { langTranslations, setupI18nConfig } from '../i18n/setup';

export default async function () {
  // Setup project
  await setupI18nConfig();
  await setupProjectWithSSRAppEngine();

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

  export const routes: ServerRoute[] = [
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
