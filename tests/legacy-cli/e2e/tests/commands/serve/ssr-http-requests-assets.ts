import assert from 'node:assert';
import { Agent } from 'undici';
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
  writeMultipleFiles({
    'server.key': `-----BEGIN PRIVATE KEY-----
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
xlFXnn9FIQthAEWUhFgqApO+oKBn0hw=
-----END PRIVATE KEY-----
`,
    'server.crt': `-----BEGIN CERTIFICATE-----
MIIFCTCCAvGgAwIBAgIUd0CiuFYYUTnnfB/Q6lijpEZJy4wwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MB4XDTI1MTEwNzEwMTE0NFoXDTI2MTEw
NzEwMTE0NFowFDESMBAGA1UEAwwJbG9jYWxob3N0MIICIjANBgkqhkiG9w0BAQEF
AAOCAg8AMIICCgKCAgEAzsgZlcutcxKn7KEz0PYE19t9/55a1V7WlBiZGw0eWnLa
tF/l0LWbiKDuCYEaYmM+f/F4mPAImjHbd9Gm7oDuQIciG7BskMb89rIu8ikPllHR
fw0U6X06u+hPBF0fFvQSPg06Rv9ZzRgXdZaTGvDTHx6i74baXmx7gXG9QQkXpcvh
SCx1Qxn/nXwiL0dGb7fAId6iy+r7196cxajPV6131IFiqqW8/i9QXgjyC7B/lGjj
gs828qy6GOn52sI1JHP4nh1snK6O3QVJbiSf5HBraT2A/4bDBXF8+g+u6myBbnOg
8/Qq1iGoABTKivdRQLVKcnz+/oy4pEDkk6RQy4CfpJQAxgomegv3b41LGDPuDC/X
V+kPa4+rEKP6I9A7HY9/SeZlZpJZG0T+aoXjBk8nNPf2pm4mBX81hDDJxHAk/wkv
69avd6EQxtNgsehdQdOZrUfvwBcQCelMS9rt6DD1WNe/RVo8dvmL2363TaxZ1m/H
kTIkWSFvDvKbSpK4fiy9UYXqflv9TcXa6YOxNq1j/AFq95nXfnJ2rrxf9sjHnAQy
1Z5Nzjko3Li3PovZ4Dg9MR3XEXzvPZq8oyHsBCK1EOFNGYMhzIvfaleMMl4XfR80
1IE9NUKH7IrhfcclX52p7EDo96KjoAkvdlRHqmZy14GlaIf/vvxVe6+Auc8S8y8C
AwEAAaNTMFEwHQYDVR0OBBYEFCOiC0xvMbfCFzmseoMDht+ydKBbMB8GA1UdIwQY
MBaAFCOiC0xvMbfCFzmseoMDht+ydKBbMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZI
hvcNAQELBQADggIBAJSiQwcaGVhwUorkb062cyyZOAstEJ5meg6H2g3nL894oWEU
FLc/S20z2tqO1It4rZB3cRKmB0RvH78eh4aUPAh0lPa/bm/h7WrgdEAJUmlNuZV3
Hitd/c1d2OVzx6w+CFYd/G5GW3sWblYiH0paIN6s4TqHFY/IAzzZKQB7Ud7FJagM
KMkEP8RFDm7iRcENuSf51LtZb2NjN1TM5CK5sVXu62dvPYZC6SW052/qd1U+1Tyw
EX4fCqUgEoGoU6+Ftz3hCdVy3E4uzFBK1e5wmct6HULBZL51PWpf3BgwneZy0itE
lD6Y0H6m/9KMVcXpAHZK+6YnOOcWxIgfjykjZEO99rx3pVWPw1uSBUJEu1SLknAn
JDe+WLp+xmB8s62EjixZsEGqoQYYrtZ3vz8u4PSSgYPJjdAkFdLOPitf0U8ZW9/7
hGyHgqd7WQ3toBwwdnPo6fZqHHyN8rXeWcmx8Uj9oyY1uunkSmq3csITPQg/zKBO
6RsO3pPj8mHjeAZCDs+Ks68ccPsn+53fJ9CrjiJlHFIP0ywbEBO1snJDit5q3gQI
/UpClB9Sl+mz4wznOvrKycrxrLEptZeBA5c6M9Qr30YJAb/prxvzSY5FrUGcstkO
CQVzSwZEUXxSo6K4cJ55vC0p3P3aoMvEpHfM+JqL3lCM9qWrxfkhvn8YS+Gg
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
