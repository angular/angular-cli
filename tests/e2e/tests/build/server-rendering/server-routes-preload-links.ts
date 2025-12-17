import assert from 'node:assert';
import { replaceInFile, writeMultipleFiles } from '../../../utils/fs';
import { execAndWaitForOutputToMatch, ng, noSilentNg, silentNg } from '../../../utils/process';
import { installWorkspacePackages, uninstallPackage } from '../../../utils/packages';
import { ngServe, updateJsonFile, useSha } from '../../../utils/project';
import { getGlobalVariable } from '../../../utils/env';
import { findFreePort } from '../../../utils/network';

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

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appProject = workspaceJson.projects['test-project'];
    appProject.architect['build'].options.namedChunks = true;
  });

  // Add routes
  await writeMultipleFiles({
    'src/app/app.routes.ts': `
  import { Routes } from '@angular/router';

  export const routes: Routes = [
    {
      path: '',
      loadComponent: () => import('./home/home').then(c => c.Home),
    },
    {
      path: 'ssg',
      loadChildren: () => import('./ssg.routes').then(m => m.routes),
    },
    {
      path: 'ssr',
      loadComponent: () => import('./ssr/ssr').then(c => c.Ssr),
    },
    {
      path: 'csr',
      loadComponent: () => import('./csr/csr').then(c => c.Csr),
    },
  ];
  `,
    'src/app/app.routes.server.ts': `
  import { RenderMode, ServerRoute } from '@angular/ssr';

  export const serverRoutes: ServerRoute[] = [
    {
      path: 'ssr',
      renderMode: RenderMode.Server,
    },
    {
      path: 'csr',
      renderMode: RenderMode.Client,
    },
    {
      path: '**',
      renderMode: RenderMode.Prerender,
    },
  ];
  `,
    'src/app/cross-dep.ts': `export const foo = 'foo';`,
    'src/app/ssg.routes.ts': `
  import { Routes } from '@angular/router';

  export const routes: Routes = [
    {
      path: '',
      loadComponent: () => import('./ssg-component/ssg-component').then(c => c.SsgComponent),
    },
    {
      path: 'one',
      loadComponent: () => import('./ssg-one/ssg-one').then(c => c.SsgOne),
    },
    {
      path: 'two',
      loadComponent: () => import('./ssg-two/ssg-two').then(c => c.SsgTwo),
    },
  ];`,
  });

  // Generate components for the above routes
  const componentNames: string[] = ['home', 'ssg-component', 'csr', 'ssr', 'ssg-one', 'ssg-two'];

  for (const componentName of componentNames) {
    await silentNg('generate', 'component', componentName);
  }

  // Add a cross-dependency
  await Promise.all([
    replaceInFile(
      'src/app/ssg-one/ssg-one.ts',
      `One {`,
      `One {
          async ngOnInit() {
            await import('../cross-dep');
          }
      `,
    ),
    replaceInFile(
      'src/app/ssg-two/ssg-two.ts',
      `Two {`,
      `Two {
          async ngOnInit() {
            await import('../cross-dep');
          }
      `,
    ),
  ]);

  // Test both vite and `ng build`
  await runTests(await ngServe());

  await noSilentNg('build', '--output-mode=server');
  await runTests(await spawnServer());
}

const RESPONSE_EXPECTS: Record<
  string,
  {
    matches: RegExp[];
    notMatches: RegExp[];
  }
> = {
  '/': {
    matches: [/<link rel="modulepreload" href="(home-[a-zA-Z0-9]{8}\.js)">/],
    notMatches: [/ssg\-component/, /ssr/, /csr/, /cross-dep-/],
  },
  '/ssg': {
    matches: [
      /<link rel="modulepreload" href="(ssg\.routes-[a-zA-Z0-9]{8}\.js)">/,
      /<link rel="modulepreload" href="(ssg-component-[a-zA-Z0-9]{8}\.js)">/,
    ],
    notMatches: [/home/, /ssr/, /csr/, /ssg-one/, /ssg-two/, /cross-dep-/],
  },
  '/ssg/one': {
    matches: [
      /<link rel="modulepreload" href="(ssg\.routes-[a-zA-Z0-9]{8}\.js)">/,
      /<link rel="modulepreload" href="(ssg-one-[a-zA-Z0-9]{8}\.js)">/,
    ],
    notMatches: [/home/, /ssr/, /csr/, /ssg-two/, /ssg\-component/, /cross-dep-/],
  },
  '/ssg/two': {
    matches: [
      /<link rel="modulepreload" href="(ssg\.routes-[a-zA-Z0-9]{8}\.js)">/,
      /<link rel="modulepreload" href="(ssg-two-[a-zA-Z0-9]{8}\.js)">/,
    ],
    notMatches: [/home/, /ssr/, /csr/, /ssg-one/, /ssg\-component/, /cross-dep-/],
  },
  '/ssr': {
    matches: [/<link rel="modulepreload" href="(ssr-[a-zA-Z0-9]{8}\.js)">/],
    notMatches: [/home/, /ssg\-component/, /csr/],
  },
  '/csr': {
    matches: [/<link rel="modulepreload" href="(csr-[a-zA-Z0-9]{8}\.js)">/],
    notMatches: [/home/, /ssg\-component/, /ssr/, /cross-dep-/],
  },
};

async function runTests(port: number): Promise<void> {
  for (const [pathname, { matches, notMatches }] of Object.entries(RESPONSE_EXPECTS)) {
    const res = await fetch(`http://localhost:${port}${pathname}`);
    const text = await res.text();

    for (const match of matches) {
      assert.match(text, match, `Response for '${pathname}': ${match} was not matched in content.`);

      // Ensure that the url is correct and it's a 200.
      const link = text.match(match)?.[1];
      const preloadRes = await fetch(`http://localhost:${port}/${link}`);
      assert.equal(preloadRes.status, 200);
    }

    for (const match of notMatches) {
      assert.doesNotMatch(
        text,
        match,
        `Response for '${pathname}': ${match} was matched in content.`,
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
