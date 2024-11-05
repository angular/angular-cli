import { join } from 'node:path';
import { existsSync } from 'node:fs';
import assert from 'node:assert';
import { expectFileNotToExist, expectFileToMatch, writeFile } from '../../../utils/fs';
import { ng, noSilentNg, silentNg } from '../../../utils/process';
import { installWorkspacePackages, uninstallPackage } from '../../../utils/packages';
import { useSha } from '../../../utils/project';
import { getGlobalVariable } from '../../../utils/env';
import { langTranslations, setupI18nConfig } from '../../i18n/setup';

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
      path: '**',
      renderMode: RenderMode.Prerender,
    },
  ];
  `,
  );

  await writeFile(
    'src/app/app.config.ts',
    `
      import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
      import { provideRouter } from '@angular/router';

      import { routes } from './app.routes';
      import { provideClientHydration } from '@angular/platform-browser';
      import { APP_BASE_HREF } from '@angular/common';

      export const appConfig: ApplicationConfig = {
        providers: [
          provideZoneChangeDetection({ eventCoalescing: true }),
          provideRouter(routes),
          provideClientHydration(),
          {
            provide: APP_BASE_HREF,
            useValue: '/',
          },
        ],
      };
      `,
  );

  // Generate components for the above routes
  await silentNg('generate', 'component', 'home');
  await silentNg('generate', 'component', 'ssg');

  await noSilentNg('build', '--output-mode=static');

  for (const { lang, outputPath } of langTranslations) {
    await expectFileToMatch(join(outputPath, 'index.html'), `<p id="locale">${lang}</p>`);
    await expectFileToMatch(join(outputPath, 'ssg/index.html'), `<p id="locale">${lang}</p>`);
  }

  // Check that server directory does not exist
  assert(
    !existsSync('dist/test-project/server'),
    'Server directory should not exist when output-mode is static',
  );
}
