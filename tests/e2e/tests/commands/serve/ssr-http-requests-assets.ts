import assert from 'node:assert';
import { Agent, fetch } from 'undici';
import { killAllProcesses, ng } from '../../../utils/process';
import { writeMultipleFiles } from '../../../utils/fs';
import { installWorkspacePackages, uninstallPackage } from '../../../utils/packages';
import { ngServe, useSha } from '../../../utils/project';

export default async function () {
  await uninstallPackage('@angular/ssr');
  await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');
  await useSha();
  await installWorkspacePackages();

  await writeMultipleFiles({
    // Add http client and route
    'src/app/app.config.ts': `
      import { ApplicationConfig } from '@angular/core';
      import { provideRouter } from '@angular/router';

      import { Home } from './home/home';
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
    // Update component to do an HTTP call to asset.
    'src/app/app.ts': `
    import { ChangeDetectorRef, Component, inject } from '@angular/core';
    import { CommonModule } from '@angular/common';
    import { RouterOutlet } from '@angular/router';
    import { HttpClient } from '@angular/common/http';

    @Component({
      selector: 'app-root',
      imports: [CommonModule, RouterOutlet],
      template: \`
        <p>{{ data | json }}</p>
        <router-outlet></router-outlet>
      \`,
    })
    export class App {
      data: any;
      private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

      constructor() {
        const http = inject(HttpClient);
        http.get('/media.json').toPromise().then((d) => {
          this.data = d;
          this.cdr.markForCheck();
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

  const sslPort = await ngServe('--ssl');
  assert.match(
    await (
      await fetch(`https://localhost:${sslPort}/`, {
        dispatcher: new Agent({
          connect: {
            rejectUnauthorized: false,
          },
        }),
      })
    ).text(),
    match,
  );

  await killAllProcesses();

  // With OpenSSl cert+key
  await writeMultipleFiles({
    'server.key': `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgEpythQjrJo9bm8GM
LFacGutCqc/XxDZ3dDkSMYZYZ2ehRANCAARvwtZ3OwP1uLhrcLp7nemvaWqkA+FN
NDjOA3OZKhyVHYog1jNTawJJjwk66upbXGFL8622yU1INWbZFxvrSANl
-----END PRIVATE KEY-----
`,
    'server.crt': `-----BEGIN CERTIFICATE-----
MIIBfzCCASWgAwIBAgIUUoRhwzxAE3y5nrOW8de+cJEIVvQwCgYIKoZIzj0EAwIw
FDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTI2MTAxOTA4NTUyNVoYDzIxMjYwOTI1
MDg1NTI1WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwWTATBgcqhkjOPQIBBggqhkjO
PQMBBwNCAARvwtZ3OwP1uLhrcLp7nemvaWqkA+FNNDjOA3OZKhyVHYog1jNTawJJ
jwk66upbXGFL8622yU1INWbZFxvrSANlo1MwUTAdBgNVHQ4EFgQUWyqB1QeFcs6L
LL7Utsybm6+XFvIwHwYDVR0jBBgwFoAUWyqB1QeFcs6LLL7Utsybm6+XFvIwDwYD
VR0TAQH/BAUwAwEB/zAKBggqhkjOPQQDAgNIADBFAiBazry25W+Qewb/WzadhmdY
YDGdshNZCk0g0DI3ctNjlgIhAKm2X8pmqdkM38Yh8QDN0cHBsAcDfRYffDnjJ3tP
dpnU
-----END CERTIFICATE-----
`,
  });

  const sslPortForCerts = await ngServe('--ssl', '--ssl-cert=server.crt', '--ssl-key="server.key"');
  assert.match(
    await (
      await fetch(`https://localhost:${sslPortForCerts}/`, {
        dispatcher: new Agent({
          connect: {
            rejectUnauthorized: false,
          },
        }),
      })
    ).text(),
    match,
  );
}
