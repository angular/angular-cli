import assert from 'node:assert';

import { killAllProcesses, ng } from '../../../utils/process';
import { rimraf, writeMultipleFiles } from '../../../utils/fs';
import { installWorkspacePackages } from '../../../utils/packages';
import { ngServe, useSha } from '../../../utils/project';

export default async function () {
  // Forcibly remove in case another test doesn't clean itself up.
  await rimraf('node_modules/@angular/ssr');
  await ng('add', '@angular/ssr', '--server-routing', '--skip-confirmation');
  await useSha();
  await installWorkspacePackages();

  await writeMultipleFiles({
    // Add http client and route
    'src/app/app.config.ts': `
      import { ApplicationConfig } from '@angular/core';
      import { provideRouter } from '@angular/router';

      import { HomeComponent } from './home/home.component';
      import { provideClientHydration } from '@angular/platform-browser';
      import { provideHttpClient, withFetch } from '@angular/common/http';

      export const appConfig: ApplicationConfig = {
        providers: [
          provideRouter([{
            path: '',
            component: HomeComponent,
          }]),
          provideClientHydration(),
          provideHttpClient(withFetch()),
        ],
      };
    `,
    // Add asset
    'public/media.json': JSON.stringify({ dataFromAssets: true }),
    // Update component to do an HTTP call to asset.
    'src/app/app.component.ts': `
    import { Component, inject } from '@angular/core';
    import { CommonModule } from '@angular/common';
    import { RouterOutlet } from '@angular/router';
    import { HttpClient } from '@angular/common/http';

    @Component({
      selector: 'app-root',
      standalone: true,
      imports: [CommonModule, RouterOutlet],
      template: \`
        <p>{{ data | json }}</p>
        <router-outlet></router-outlet>
      \`,
    })
    export class AppComponent {
      data: any;
      constructor() {
        const http = inject(HttpClient);
        http.get('/media.json').toPromise().then((d) => {
          this.data = d;
        });
      }
    }
    `,
  });

  await ng('generate', 'component', 'home');
  const match = /<p>{[\S\s]*"dataFromAssets":[\s\S]*true[\S\s]*}<\/p>/;
  const port = await ngServe('--no-ssl');
  assert.match(await (await fetch(`http://localhost:${port}/`)).text(), match);

  await killAllProcesses();

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const sslPort = await ngServe('--ssl');
    assert.match(await (await fetch(`https://localhost:${sslPort}/`)).text(), match);
  } finally {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  }
}
