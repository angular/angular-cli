import { join } from 'path';
import { getGlobalVariable } from '../../../utils/env';
import { expectFileToMatch, rimraf, writeFile } from '../../../utils/fs';
import { installWorkspacePackages } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { updateJsonFile, useSha } from '../../../utils/project';

export default async function () {
  const projectName = 'test-project-two';
  await ng('generate', 'application', projectName, '--standalone', '--skip-install');

  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
  if (useWebpackBuilder) {
    // Forcibly remove in case another test doesn't clean itself up.
    await rimraf('node_modules/@angular/ssr');

    // Setup webpack builder if esbuild is not requested on the commandline
    await updateJsonFile('angular.json', (json) => {
      const build = json['projects'][projectName]['architect']['build'];
      build.builder = '@angular-devkit/build-angular:browser';
      build.options = {
        ...build.options,
        main: build.options.browser,
        browser: undefined,
      };

      build.configurations.development = {
        ...build.configurations.development,
        vendorChunk: true,
        namedChunks: true,
        buildOptimizer: false,
      };
    });

    // Angular SSR is not needed to do prerendering but it is the easiest way to enable when usign webpack based builders.
    await ng(
      'add',
      '@angular/ssr',
      '--project',
      projectName,
      '--skip-confirmation',
      '--skip-install',
    );
  } else {
    await ng('generate', 'server', '--project', projectName, '--skip-install');
  }

  await useSha();
  await installWorkspacePackages();

  // Add routes
  await writeFile(
    `projects/${projectName}/src/app/app.routes.ts`,
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
    await ng('generate', 'component', componentName, '--project', projectName);
  }

  // Prerender pages
  if (useWebpackBuilder) {
    await ng('run', projectName + ':prerender:production');
    await runExpects();

    return;
  }

  await ng('build', projectName, '--configuration=production', '--prerender');
  await runExpects();

  // Test also JIT mode.
  await ng('build', projectName, '--configuration=development', '--prerender', '--no-aot');
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

    let distPath = 'dist/' + projectName;
    if (useWebpackBuilder) {
      distPath += '/browser';
    }

    for (const [filePath, fileMatch] of Object.entries(expects)) {
      await expectFileToMatch(join(distPath, filePath), fileMatch);
    }
  }
}
