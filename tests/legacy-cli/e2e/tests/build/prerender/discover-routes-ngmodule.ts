import { join } from 'path';
import { getGlobalVariable } from '../../../utils/env';
import { expectFileToMatch, rimraf, writeFile } from '../../../utils/fs';
import { installWorkspacePackages } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { useSha } from '../../../utils/project';

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
    'src/app/app-routing.module.ts',
    `
  import { NgModule } from '@angular/core';
  import { RouterModule, Routes } from '@angular/router';
  import { OneComponent } from './one/one.component';
  import { TwoChildOneComponent } from './two-child-one/two-child-one.component';
  import { TwoChildTwoComponent } from './two-child-two/two-child-two.component';

  const routes: Routes = [
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
  ];

  @NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
  })
  export class AppRoutingModule {}
  `,
  );

  // Generate components for the above routes
  await ng('generate', 'component', 'one');
  await ng('generate', 'component', 'two-child-one');
  await ng('generate', 'component', 'two-child-two');

  // Generate lazy routes
  await ng('generate', 'module', 'lazy-one', '--route', 'lazy-one', '--module', 'app.module');
  await ng(
    'generate',
    'module',
    'lazy-one-child',
    '--route',
    'lazy-one-child',
    '--module',
    'lazy-one/lazy-one.module',
  );
  await ng('generate', 'module', 'lazy-two', '--route', 'lazy-two', '--module', 'app.module');

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

    let distPath = 'dist/test-project';
    if (useWebpackBuilder) {
      distPath += '/browser';
    }

    for (const [filePath, fileMatch] of Object.entries(expects)) {
      await expectFileToMatch(join(distPath, filePath), fileMatch);
    }
  }
}
