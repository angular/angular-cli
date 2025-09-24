import { ng } from '../../../utils/process';
import { getGlobalVariable } from '../../../utils/env';
import { expectFileToMatch, writeMultipleFiles } from '../../../utils/fs';
import { installWorkspacePackages, uninstallPackage } from '../../../utils/packages';
import { useSha } from '../../../utils/project';

export default async function () {
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
  if (useWebpackBuilder) {
    // Not supported by the webpack based builder.
    return;
  }

  await uninstallPackage('@angular/ssr');
  await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');
  await useSha();
  await installWorkspacePackages();

  await writeMultipleFiles({
    // Add http client and route
    'src/app/app.config.ts': `
      import { ApplicationConfig } from '@angular/core';
      import { provideRouter } from '@angular/router';

      import {Home} from './home/home';
      import { provideClientHydration } from '@angular/platform-browser';
      import { provideHttpClient, withFetch } from '@angular/common/http';

      export const appConfig: ApplicationConfig = {
        providers: [
          provideRouter([{
            path: '',
            component: Home,
          }]),
          provideClientHydration(),
          provideHttpClient(withFetch()),
        ],
      };
    `,

    // Add asset
    'public/media.json': JSON.stringify({ dataFromAssets: true }),
    'public/media with-space.json': JSON.stringify({ dataFromAssetsWithSpace: true }),

    // Update component to do an HTTP call to asset.
    'src/app/app.ts': `
    import { ChangeDetectorRef, Component, inject } from '@angular/core';
    import { CommonModule } from '@angular/common';
    import { RouterOutlet } from '@angular/router';
    import { HttpClient } from '@angular/common/http';

    @Component({
      selector: 'app-root',
      standalone: true,
      imports: [CommonModule, RouterOutlet],
      template: \`
        <p>{{ data | json }}</p>
        <p>{{ dataWithSpace | json }}</p>
        <router-outlet></router-outlet>
      \`,
    })
    export class App {
      data: any;
      dataWithSpace: any;
      private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

      constructor() {
        const http = inject(HttpClient);
        http.get('/media.json').subscribe((d) => {
          this.data = d;
          this.cdr.markForCheck();
        });

        http.get('/media%20with-space.json').subscribe((d) => {
          this.dataWithSpace = d;
          this.cdr.markForCheck();
        });
      }
    }
    `,
  });

  await ng('generate', 'component', 'home');
  await ng('build', '--configuration=production', '--prerender');
  await expectFileToMatch(
    'dist/test-project/browser/index.html',
    /<p>{[\S\s]*"dataFromAssets":[\s\S]*true[\S\s]*}<\/p>/,
  );
  await expectFileToMatch(
    'dist/test-project/browser/index.html',
    /<p>{[\S\s]*"dataFromAssetsWithSpace":[\s\S]*true[\S\s]*}<\/p>/,
  );
}
