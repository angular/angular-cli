import { join } from 'node:path';
import assert from 'node:assert';
import { expectFileToMatch, writeFile } from '../../../utils/fs';
import { execAndWaitForOutputToMatch, ng, noSilentNg, silentNg } from '../../../utils/process';
import { langTranslations, setupI18nConfig } from '../../i18n/setup';
import { findFreePort } from '../../../utils/network';
import { getGlobalVariable } from '../../../utils/env';
import { installWorkspacePackages, uninstallPackage } from '../../../utils/packages';
import { updateJsonFile, useSha } from '../../../utils/project';

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  // Setup project
  await setupI18nConfig();

  // Update angular.json
  const URL_SUB_PATH: Record<string, string> = {
    'en-US': '',
    'fr': 'fr',
    'de': 'deutsche',
  };

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appProject = workspaceJson.projects['test-project'];
    const i18n: Record<string, any> = appProject.i18n;
    i18n.sourceLocale = {
      subPath: URL_SUB_PATH['en-US'],
    };

    i18n.locales['fr'] = {
      translation: i18n.locales['fr'],
      subPath: URL_SUB_PATH['fr'],
    };

    i18n.locales['de'] = {
      translation: i18n.locales['de'],
      subPath: URL_SUB_PATH['de'],
    };
  });

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
  const componentNames: string[] = ['home', 'ssg', 'ssr'];
  for (const componentName of componentNames) {
    await silentNg('generate', 'component', componentName);
  }

  await noSilentNg('build', '--output-mode=server', '--base-href=/base/');

  const pathToVerify = ['/index.html', '/ssg/index.html'];
  for (const { lang } of langTranslations) {
    const subPath = URL_SUB_PATH[lang];
    const outputPath = join('dist/test-project/browser', subPath);

    for (const path of pathToVerify) {
      await expectFileToMatch(join(outputPath, path), `<p id="locale">${lang}</p>`);
      const baseHref = `/base/${subPath ? `${subPath}/` : ''}`;
      await expectFileToMatch(join(outputPath, path), `<base href="${baseHref}">`);
    }
  }

  // Tests responses
  const port = await spawnServer();
  const pathnamesToVerify = ['/ssr', '/ssg'];

  for (const { lang } of langTranslations) {
    for (const pathname of pathnamesToVerify) {
      const subPath = URL_SUB_PATH[lang];
      const urlPathname = `/base${subPath ? `/${subPath}` : ''}${pathname}`;
      const res = await fetch(`http://localhost:${port}${urlPathname}`);
      const text = await res.text();

      assert.match(
        text,
        new RegExp(`<p id="locale">${lang}</p>`),
        `Response for '${urlPathname}': '<p id="locale">${lang}</p>' was not matched in content.`,
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
      ...process.env,
      'PORT': String(port),
    },
  );

  return port;
}
