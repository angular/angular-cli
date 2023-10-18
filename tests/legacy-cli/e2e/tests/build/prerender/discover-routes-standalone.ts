import { join } from 'path';
import { getGlobalVariable } from '../../../utils/env';
import { expectFileToMatch, readFile, rimraf, writeFile } from '../../../utils/fs';
import { installWorkspacePackages } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { useSha } from '../../../utils/project';
import { deepStrictEqual } from 'node:assert';

export default async function () {
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
  if (useWebpackBuilder) {
    // Forcibly remove in case another test doesn't clean itself up.
    await rimraf('node_modules/@angular/ssr');

    // Angular SSR is not needed to do prerendering but it is the easiest way to enable when usign webpack based builders.
    await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');
  } else {
    await ng('generate', 'server', '--skip-install');
  }

  await useSha();
  await installWorkspacePackages();

  // Add routes
  await writeFile(
    'src/app/app.routes.ts',
    `
  import { Routes } from '@angular/router';
  import { OneComponent } from './one/one.component';
  import { TwoChildOneComponent } from './two-child-one/two-child-one.component';
  import { TwoChildTwoComponent } from './two-child-two/two-child-two.component';

  export const routes: Routes = [
    {
      path: '',
      component: OneComponent,
    },
    {
      path: 'two',
      children: [
        {
          path: 'two-child-one',
          component: TwoChildOneComponent,
        },
        {
          path: 'two-child-two',
          component: TwoChildTwoComponent,
        },
      ],
    },
    {
      path: 'lazy-one',
      children: [
        {
          path: '',
          loadComponent: () => import('./lazy-one/lazy-one.component').then(c => c.LazyOneComponent),
        },
        {
          path: 'lazy-one-child',
          loadComponent: () => import('./lazy-one-child/lazy-one-child.component').then(c => c.LazyOneChildComponent),
        },
      ],
    },
    {
      path: 'lazy-two',
      loadComponent: () => import('./lazy-two/lazy-two.component').then(c => c.LazyTwoComponent),
    },
  ];
  `,
  );

  // Generate components for the above routes
  const componentNames: string[] = [
    'one',
    'two-child-one',
    'two-child-two',
    'lazy-one',
    'lazy-one-child',
    'lazy-two',
  ];

  for (const componentName of componentNames) {
    await ng('generate', 'component', componentName);
  }

  // Prerender pages
  if (useWebpackBuilder) {
    await ng('run', 'test-project:prerender:production');
    await runExpects();

    return;
  }

  await ng('build', '--configuration=production', '--prerender');
  await runExpects();

  // Test also JIT mode.
  await ng('build', '--configuration=development', '--prerender', '--no-aot');
  await runExpects();

  async function runExpects(): Promise<void> {
    const expects: Record<string, string> = {
      'index.html': 'one works!',
      'two/index.html': 'router-outlet',
      'two/two-child-one/index.html': 'two-child-one works!',
      'two/two-child-two/index.html': 'two-child-two works!',
      'lazy-one/index.html': 'lazy-one works!',
      'lazy-one/lazy-one-child/index.html': 'lazy-one-child works!',
      'lazy-two/index.html': 'lazy-two works!',
    };

    for (const [filePath, fileMatch] of Object.entries(expects)) {
      await expectFileToMatch(join('dist/test-project/browser', filePath), fileMatch);
    }

    if (!useWebpackBuilder) {
      // prerendered-routes.json file is only generated when using esbuild.
      const generatedRoutesStats = await readFile('dist/test-project/prerendered-routes.json');
      deepStrictEqual(JSON.parse(generatedRoutesStats), {
        routes: [
          '/',
          '/lazy-one',
          '/lazy-one/lazy-one-child',
          '/lazy-two',
          '/two',
          '/two/two-child-one',
          '/two/two-child-two',
        ],
      });
    }
  }
}
