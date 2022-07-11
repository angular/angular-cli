/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/* eslint-disable import/no-extraneous-dependencies */
import { Architect, BuilderRun } from '@angular-devkit/architect';
import { tags } from '@angular-devkit/core';
import { createServer } from 'http';
import { createProxyServer } from 'http-proxy';
import { AddressInfo } from 'net';
import puppeteer, { Browser, Page } from 'puppeteer';
import { debounceTime, switchMap, take } from 'rxjs/operators';
import { createArchitect, host } from '../../../testing/test-utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const document: any;

interface ProxyInstance {
  server: typeof createProxyServer extends () => infer R ? R : never;
  url: string;
}

function findFreePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('listening', () => {
      const port = (server.address() as AddressInfo).port;
      server.close((e) => (e ? reject(e) : resolve(port)));
    });
    server.once('error', (e) => server.close(() => reject(e)));
    server.listen();
  });
}

async function createProxy(target: string, secure: boolean, ws = true): Promise<ProxyInstance> {
  const proxyPort = await findFreePort();
  const server = createProxyServer({
    ws,
    target,
    secure,
    ssl: secure && {
      key: tags.stripIndents`
      -----BEGIN RSA PRIVATE KEY-----
      MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDEBRUsUz4rdcMt
      CQGLvG3SzUinsmgdgOyTNQNA0eOMyRSrmS8L+F/kSLUnqqu4mzdeqDzo2Xj553jK
      dRqMCRFGJuGnQ/VIbW2A+ywgrqILuDyF5i4PL1aQW4yJ7TnXfONKfpswQArlN6DF
      gBYJtoJlf8XD1sOeJpsv/O46/ix/wngQ+GwQQ2cfqxQT0fE9SBCY23VNt3SPUJ3k
      9etJMvJ9U9GHSb1CFdNQe7Gyx7xdKf1TazB27ElNZEg2aF99if47uRskYjvvFivy
      7nxGx/ccIwjwNMpk29AsKG++0sn1yTK7tD5Px6aCSVK0BKbdXZS2euJor8hASGBJ
      3GpVGJvdAgMBAAECggEAapYo8TVCdPdP7ckb4hPP0/R0MVu9aW2VNmZ5ImH+zar5
      ZmWhQ20HF2bBupP/VB5yeTIaDLNUKO9Iqy4KBWNY1UCHKyC023FFPgFV+V98FctU
      faqwGOmwtEZToRwxe48ZOISndhEc247oCPyg/x8SwIY9z0OUkwaDFBEAqWtUXxM3
      /SPpCT5ilLgxnRgVB8Fj5Z0q7ThnxNVOmVC1OSIakEj46PzmMXn1pCKLOCUmAAOQ
      BnrOZuty2b8b2M/GHsktLZwojQQJmArnIBymTXQTVhaGgKSyOv1qvHLp9L1OJf0/
      Xm+/TqT6ztzhzlftcObdfQZZ5JuoEwlvyrsGFlA3MQKBgQDiQC3KYMG8ViJkWrv6
      XNAFEoAjVEKrtirGWJ66YfQ9KSJ7Zttrd1Y1V1OLtq3z4YMH39wdQ8rOD+yR8mWV
      6Tnsxma6yJXAH8uan8iVbxjIZKF1hnvNCxUoxYmWOmTLcEQMzmxvTzAiR+s6R6Uj
      9LgGqppt30nM4wnOhOJU6UxqbwKBgQDdy03KidbPZuycJSy1C9AIt0jlrxDsYm+U
      fZrB6mHEZcgoZS5GbLKinQCdGcgERa05BXvJmNbfZtT5a37YEnbjsTImIhDiBP5P
      nW36/9a3Vg1svd1KP2206/Bh3gfZbgTsQg4YogXgjf0Uzuvw18btgTtLVpVyeuqz
      TU3eeF30cwKBgQCN6lvOmapsDEs+T3uhqx4AUH53qp63PmjOSUAnANJGmsq6ROZV
      HmHAy6nn9Qpf85BRHCXhZWiMoIhvc3As/EINNtWxS6hC/q6jqp4SvcD50cVFBroY
      /16iWGXZCX+37A+DSOfTWgSDPEFcKRx41UOpStHbITgVgEPieo/NWxlHmQKBgQDX
      JOLs2RB6V0ilnpnjdPXzvncD9fHgmwvJap24BPeZX3HtXViqD76oZsu1mNCg9EW3
      zk3pnEyyoDlvSIreZerVq4kN3HWsCVP3Pqr0kz9g0CRtmy8RWr28hjHDfXD3xPUZ
      iGnMEz7IOHOKv722/liFAprV1cNaLUmFbDNg3jmlaQKBgQDG5WwngPhOHmjTnSml
      amfEz9a4yEhQqpqgVNW5wwoXOf6DbjL2m/maJh01giThj7inMcbpkZlIclxD0Eu6
      Lof+ctCeqSAJvaVPmd+nv8Yp26zsF1yM8ax9xXjrIvv9fSbycNveGTDCsNNTiYoW
      QyvMqmN1kGy20SZbQDD/fLfqBQ==
      -----END RSA PRIVATE KEY-----
    `,
      cert: tags.stripIndents`
      -----BEGIN CERTIFICATE-----
      MIIDXTCCAkWgAwIBAgIJALz8gD/gAt0OMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
      BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
      aWRnaXRzIFB0eSBMdGQwHhcNMTgxMDIzMTgyMTQ5WhcNMTkxMDIzMTgyMTQ5WjBF
      MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
      ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
      CgKCAQEAxAUVLFM+K3XDLQkBi7xt0s1Ip7JoHYDskzUDQNHjjMkUq5kvC/hf5Ei1
      J6qruJs3Xqg86Nl4+ed4ynUajAkRRibhp0P1SG1tgPssIK6iC7g8heYuDy9WkFuM
      ie0513zjSn6bMEAK5TegxYAWCbaCZX/Fw9bDniabL/zuOv4sf8J4EPhsEENnH6sU
      E9HxPUgQmNt1Tbd0j1Cd5PXrSTLyfVPRh0m9QhXTUHuxsse8XSn9U2swduxJTWRI
      NmhffYn+O7kbJGI77xYr8u58Rsf3HCMI8DTKZNvQLChvvtLJ9ckyu7Q+T8emgklS
      tASm3V2UtnriaK/IQEhgSdxqVRib3QIDAQABo1AwTjAdBgNVHQ4EFgQUDZBhVKdb
      3BRhLIhuuE522Vsul0IwHwYDVR0jBBgwFoAUDZBhVKdb3BRhLIhuuE522Vsul0Iw
      DAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEABh9WWZwWLgb9/DcTxL72
      6pI96t4jiF79Q+pPefkaIIi0mE6yodWrTAsBQu9I6bNRaEcCSoiXkP2bqskD/UGg
      LwUFgSrDOAA3UjdHw3QU5g2NocduG7mcFwA40TB98sOsxsUyYlzSyWzoiQWwPYwb
      hek1djuWkqPXsTjlj54PTPN/SjTFmo4p5Ip6nbRf2nOREl7v0rJpGbJvXiCMYyd+
      Zv+j4mRjCGo8ysMR2HjCUGkYReLAgKyyz3M7i8vevJhKslyOmy6Txn4F0nPVumaU
      DDIy4xXPW1STWfsmSYJfYW3wa0wk+pJQ3j2cTzkPQQ8gwpvM3U9DJl43uwb37v6I
      7Q==
      -----END CERTIFICATE-----
    `,
    },
  }).listen(proxyPort);

  return {
    server,
    url: `${secure ? 'https' : 'http'}://localhost:${proxyPort}`,
  };
}

async function goToPageAndWaitForWS(page: Page, url: string): Promise<void> {
  const baseUrl = url.replace(/^http/, 'ws');
  const socksRequest =
    baseUrl[baseUrl.length - 1] === '/' ? `${baseUrl}ng-cli-ws` : `${baseUrl}/ng-cli-ws`;
  // Create a Chrome dev tools session so that we can capturing websocket request.
  // https://github.com/puppeteer/puppeteer/issues/2974

  // We do this, to ensure that we make the right request with the expected host, port etc...
  const client = await page.target().createCDPSession();
  await client.send('Network.enable');
  await client.send('Page.enable');

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`A Websocket connected to ${socksRequest} was not established.`)),
        2000,
      );
      client.on('Network.webSocketCreated', ({ url }) => {
        if (url.startsWith(socksRequest)) {
          clearTimeout(timeout);
          resolve();
        }
      });
    }),
    page.goto(url),
  ]);
  await client.detach();
}

describe('Dev Server Builder live-reload', () => {
  const target = { project: 'app', target: 'serve' };
  // TODO: check if the below is still true.
  // Avoid using port `0` as these tests will behave differrently and tests will pass when they shouldn't.
  // Port 0 and host 0.0.0.0 have special meaning in dev-server.
  const overrides = { hmr: false, watch: true, port: 4202, liveReload: true };
  let architect: Architect;
  let browser: Browser;
  let page: Page;
  let runs: BuilderRun[];

  beforeAll(async () => {
    browser = await puppeteer.launch({
      // MacOSX users need to set the local binary manually because Chrome has lib files with
      // spaces in them which Bazel does not support in runfiles
      // See: https://github.com/angular/angular-cli/pull/17624
      // eslint-disable-next-line max-len
      // executablePath: '/Users/<USERNAME>/git/angular-cli/node_modules/puppeteer/.local-chromium/mac-818858/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      ignoreHTTPSErrors: true,
      args: ['--no-sandbox', '--disable-gpu'],
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;

    host.writeMultipleFiles({
      'src/app/app.component.html': `
        <p>{{ title }}</p>
      `,
    });

    runs = [];
    page = await browser.newPage();
  });

  afterEach(async () => {
    await host.restore().toPromise();
    await page.close();
    await Promise.all(runs.map((r) => r.stop()));
  });

  it('works without proxy', async () => {
    const run = await architect.scheduleTarget(target, overrides);
    runs.push(run);

    await run.output
      .pipe(
        debounceTime(1000),
        switchMap(async (buildEvent, buildCount) => {
          expect(buildEvent.success).toBe(true);
          const url = buildEvent.baseUrl as string;
          switch (buildCount) {
            case 0:
              await goToPageAndWaitForWS(page, url);
              host.replaceInFile('src/app/app.component.ts', `'app'`, `'app-live-reload'`);
              break;
            case 1:
              const innerText = await page.evaluate(() => document.querySelector('p').innerText);
              expect(innerText).toBe('app-live-reload');
              break;
          }
        }),
        take(2),
      )
      .toPromise();
  });

  it('works without http -> http proxy', async () => {
    const run = await architect.scheduleTarget(target, overrides);
    runs.push(run);

    let proxy: ProxyInstance | undefined;
    let buildCount = 0;
    try {
      await run.output
        .pipe(
          debounceTime(1000),
          switchMap(async (buildEvent) => {
            expect(buildEvent.success).toBe(true);
            const url = buildEvent.baseUrl as string;
            switch (buildCount) {
              case 0:
                proxy = await createProxy(url, false);
                await goToPageAndWaitForWS(page, proxy.url);
                host.replaceInFile('src/app/app.component.ts', `'app'`, `'app-live-reload'`);
                break;
              case 1:
                const innerText = await page.evaluate(() => document.querySelector('p').innerText);
                expect(innerText).toBe('app-live-reload');
                break;
            }

            buildCount++;
          }),
          take(2),
        )
        .toPromise();
    } finally {
      proxy?.server.close();
    }
  });

  it('works without https -> http proxy', async () => {
    const run = await architect.scheduleTarget(target, overrides);
    runs.push(run);

    let proxy: ProxyInstance | undefined;

    try {
      await run.output
        .pipe(
          debounceTime(1000),
          switchMap(async (buildEvent, buildCount) => {
            expect(buildEvent.success).toBe(true);
            const url = buildEvent.baseUrl as string;
            switch (buildCount) {
              case 0:
                proxy = await createProxy(url, true);
                await goToPageAndWaitForWS(page, proxy.url);
                host.replaceInFile('src/app/app.component.ts', `'app'`, `'app-live-reload'`);
                break;
              case 1:
                const innerText = await page.evaluate(() => document.querySelector('p').innerText);
                expect(innerText).toBe('app-live-reload');
                break;
            }
          }),
          take(2),
        )
        .toPromise();
    } finally {
      proxy?.server.close();
    }
  });
});
