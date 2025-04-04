import { join } from 'node:path';
import { getGlobalVariable } from '../../../utils/env';
import { expectFileToMatch, writeFile } from '../../../utils/fs';
import { installWorkspacePackages, uninstallPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { updateJsonFile, useSha } from '../../../utils/project';

export default async function () {
  const projectName = 'test-project-two';
  await ng('generate', 'application', projectName, '--no-standalone', '--skip-install');

  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
  if (useWebpackBuilder) {
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
  }

  // Forcibly remove in case another test doesn't clean itself up.
  await uninstallPackage('@angular/ssr');
  await ng(
    'add',
    '@angular/ssr',
    '--project',
    projectName,
    '--skip-confirmation',
    '--skip-install',
  );

  await useSha();
  await installWorkspacePackages();

  // Add routes
  await writeFile(
    `projects/${projectName}/src/app/app-routing-module.ts`,
    `
  import { NgModule } from '@angular/core';
  import { RouterModule, Routes } from '@angular/router';
  import { One} from './one/one';
  import { TwoChildOne } from './two-child-one/two-child-one';
  import { TwoChildTwo } from './two-child-two/two-child-two';

  const routes: Routes = [
    {
      path: '',
      component: One,
    },
    {
      path: 'two',
      children: [
        {
          path: 'two-child-one',
          component: TwoChildOne,
        },
        {
          path: 'two-child-two',
          component: TwoChildTwo,
        },
      ],
    },
  ];

  @NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
  })
  export class AppRoutingModule {}
  `,
  );

  // Generate components for the above routes
  const componentNames: string[] = ['one', 'two-child-one', 'two-child-two'];

  for (const componentName of componentNames) {
    await ng('generate', 'component', componentName, '--project', projectName);
  }

  // Generate lazy routes
  const lazyModules: [route: string, moduleName: string][] = [
    ['lazy-one', 'app-module'],
    ['lazy-one-child', 'lazy-one/lazy-one-module'],
    ['lazy-two', 'app-module'],
  ];

  for (const [route, moduleName] of lazyModules) {
    await ng(
      'generate',
      'module',
      route,
      '--route',
      route,
      '--module',
      moduleName,
      '--project',
      projectName,
    );
  }

  // Prerender pages
  if (useWebpackBuilder) {
    await ng('run', `${projectName}:prerender:production`);
    await runExpects();

    return;
  }

  await ng('build', projectName, '--configuration=production');
  await runExpects();

  // Test also JIT mode.
  await ng('build', projectName, '--configuration=development', '--no-aot');

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

    if (!useWebpackBuilder) {
      expects['index.csr.html'] = '<app-root></app-root>';
    }

    const distPath = 'dist/' + projectName + '/browser';
    for (const [filePath, fileMatch] of Object.entries(expects)) {
      await expectFileToMatch(join(distPath, filePath), fileMatch);
    }
  }
}
