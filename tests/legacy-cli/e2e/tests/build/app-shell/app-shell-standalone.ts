import { getGlobalVariable } from '../../../utils/env';
import { appendToFile, expectFileToMatch, writeMultipleFiles } from '../../../utils/fs';
import { installPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

const snapshots = require('../../../ng-snapshot/package.json');

export default async function () {
  await appendToFile('src/app/app.component.html', '<router-outlet></router-outlet>');
  await ng('generate', 'app-shell', '--project', 'test-project');

  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];
  if (isSnapshotBuild) {
    const packagesToInstall: string[] = [];
    await updateJsonFile('package.json', (packageJson) => {
      const dependencies = packageJson['dependencies'];
      // Iterate over all of the packages to update them to the snapshot version.
      for (const [name, version] of Object.entries(
        snapshots.dependencies as { [p: string]: string },
      )) {
        if (name in dependencies && dependencies[name] !== version) {
          packagesToInstall.push(version);
        }
      }
    });

    for (const pkg of packagesToInstall) {
      await installPackage(pkg);
    }
  }

  // TODO(alanagius): update the below once we have a standalone schematic.
  await writeMultipleFiles({
    'src/app/app.component.ts': `
      import { Component } from '@angular/core';
      import { RouterOutlet } from '@angular/router';

      @Component({
        selector: 'app-root',
        standalone: true,
        template: '<router-outlet></router-outlet>',
        imports: [RouterOutlet],
      })
      export class AppComponent {}
  `,
    'src/main.ts': `
      import { bootstrapApplication } from '@angular/platform-browser';
      import { provideRouter } from '@angular/router';

      import { AppComponent } from './app/app.component';

      bootstrapApplication(AppComponent, {
        providers: [
          provideRouter([]),
        ],
      });
  `,
    'src/main.server.ts': `
      import { importProvidersFrom } from '@angular/core';
      import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
      import { ServerModule } from '@angular/platform-server';

      import { provideRouter } from '@angular/router';

      import { AppShellComponent } from './app/app-shell/app-shell.component';
      import { AppComponent } from './app/app.component';

      export default () => bootstrapApplication(AppComponent, {
        providers: [
          importProvidersFrom(BrowserModule.withServerTransition({ appId: 'app' })),
          importProvidersFrom(ServerModule),
          provideRouter([{ path: 'shell', component: AppShellComponent }]),
        ],
      });
  `,
  });

  await ng('run', 'test-project:app-shell:development');
  await expectFileToMatch('dist/test-project/browser/index.html', /app-shell works!/);

  await ng('run', 'test-project:app-shell');
  await expectFileToMatch('dist/test-project/browser/index.html', /app-shell works!/);
}
