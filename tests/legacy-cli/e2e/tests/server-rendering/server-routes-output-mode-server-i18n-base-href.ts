import { join } from 'node:path';
import assert from 'node:assert';
import { expectFileToMatch, writeFile } from '../../utils/fs';
import { noSilentNg, silentNg } from '../../utils/process';
import { setupProjectWithSSRAppEngine, spawnServer } from './setup';
import { langTranslations, setupI18nConfig } from '../i18n/setup';

export default async function () {
  if (process.version.startsWith('v18')) {
    // This is not supported in Node.js version 18 as global web crypto module is not available.
    return;
  }

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
  const pathname = '/ssr';

  for (const { lang } of langTranslations) {
    const res = await fetch(`http://localhost:${port}/base/${lang}${pathname}`);
    const text = await res.text();

    assert.match(
      text,
      new RegExp(`<p id="locale">${lang}</p>`),
      `Response for '${lang}${pathname}': '<p id="locale">${lang}</p>' was not matched in content.`,
    );
  }
}
