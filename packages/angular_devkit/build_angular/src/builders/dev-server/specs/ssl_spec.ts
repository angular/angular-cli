/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Architect, BuilderRun } from '@angular-devkit/architect';
import { tags } from '@angular-devkit/core';
import { Agent, fetch } from 'undici';
import { createArchitect, host } from '../../../testing/test-utils';
import { DevServerBuilderOutput } from '../index';

describe('Dev Server Builder ssl', () => {
  const target = { project: 'app', target: 'serve' };
  let architect: Architect;
  // We use runs like this to ensure it WILL stop the servers at the end of each tests.
  let runs: BuilderRun[];

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
    runs = [];
  });
  afterEach(async () => {
    await host.restore().toPromise();
    await Promise.all(runs.map((r) => r.stop()));
  });

  it('works', async () => {
    const run = await architect.scheduleTarget(target, { ssl: true, port: 0 });
    runs.push(run);
    const output = (await run.result) as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).toMatch(/^https:\/\/localhost:\d+\//);

    const response = await fetch(output.baseUrl, {
      dispatcher: new Agent({
        connect: { rejectUnauthorized: false },
      }),
    });
    expect(await response.text()).toContain('<title>HelloWorldApp</title>');
  });

  it('supports key and cert', async () => {
    host.writeMultipleFiles({
      'ssl/server.key': tags.stripIndents`
        -----BEGIN PRIVATE KEY-----
        MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgEpythQjrJo9bm8GM
        LFacGutCqc/XxDZ3dDkSMYZYZ2ehRANCAARvwtZ3OwP1uLhrcLp7nemvaWqkA+FN
        NDjOA3OZKhyVHYog1jNTawJJjwk66upbXGFL8622yU1INWbZFxvrSANl
        -----END PRIVATE KEY-----
      `,
      'ssl/server.crt': tags.stripIndents`
        -----BEGIN CERTIFICATE-----
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

    const overrides = {
      ssl: true,
      sslKey: 'ssl/server.key',
      sslCert: 'ssl/server.crt',
      port: 0,
    };

    const run = await architect.scheduleTarget(target, overrides);
    runs.push(run);
    const output = (await run.result) as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).toMatch(/^https:\/\/localhost:\d+\//);

    const response = await fetch(output.baseUrl, {
      dispatcher: new Agent({
        connect: { rejectUnauthorized: false },
      }),
    });
    expect(await response.text()).toContain('<title>HelloWorldApp</title>');
  });
});
