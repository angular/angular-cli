import { join } from 'node:path';
import { existsSync } from 'node:fs';
import assert from 'node:assert';
import { expectFileToMatch, readFile, replaceInFile, writeFile } from '../../../utils/fs';
import { execAndWaitForOutputToMatch, ng, noSilentNg, silentNg } from '../../../utils/process';
import { installWorkspacePackages, uninstallPackage } from '../../../utils/packages';
import { useSha } from '../../../utils/project';
import { getGlobalVariable } from '../../../utils/env';
import { findFreePort } from '../../../utils/network';

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  // Forcibly remove in case another test doesn't clean itself up.
  await uninstallPackage('@angular/ssr');
  await ng('add', '@angular/ssr', '--server-routing', '--skip-confirmation', '--skip-install');
  await useSha();
  await installWorkspacePackages();

  // Test scenario to verify that the content length, including \r\n, is accurate
  await replaceInFile('src/app/app.component.ts', "title = '", "title = 'Title\\r\\n");

  // Ensure text has been updated.
  assert.match(await readFile('src/app/app.component.ts'), /title = 'Title/);

  // Add routes
  await writeFile(
    'src/app/app.routes.ts',
    `
  import { Routes } from '@angular/router';
  import { HomeComponent } from './home/home.component';
  import { CsrComponent } from './csr/csr.component';
  import { SsrComponent } from './ssr/ssr.component';
  import { SsgComponent } from './ssg/ssg.component';
  import { SsgWithParamsComponent } from './ssg-with-params/ssg-with-params.component';

  export const routes: Routes = [
    {
      path: '',
      component: HomeComponent,
    },
    {
      path: 'ssg',
      component: SsgComponent,
    },
    {
      path: 'ssr',
      component: SsrComponent,
    },
    {
      path: 'csr',
      component: CsrComponent,
    },
    {
      path: 'redirect',
      redirectTo: 'ssg'
    },
    {
      path: 'ssg/:id',
      component: SsgWithParamsComponent,
    },
  ];
  `,
  );

  // Add server routing
  await writeFile(
    'src/app/app.routes.server.ts',
    `
  import { RenderMode, ServerRoute } from '@angular/ssr';

  export const serverRoutes: ServerRoute[] = [
    {
      path: 'ssg/:id',
      renderMode: RenderMode.Prerender,
      headers: { 'x-custom': 'ssg-with-params' },
      getPrerenderParams: async() => [{id: 'one'}, {id: 'two'}],
    },
    {
      path: 'ssr',
      renderMode: RenderMode.Server,
      headers: { 'x-custom': 'ssr' },
    },
    {
      path: 'csr',
      renderMode: RenderMode.Client,
      headers: { 'x-custom': 'csr' },
    },
    {
      path: '**',
      renderMode: RenderMode.Prerender,
      headers: { 'x-custom': 'ssg' },
    },
  ];
  `,
  );

  // Generate components for the above routes
  const componentNames: string[] = ['home', 'ssg', 'ssg-with-params', 'csr', 'ssr'];

  for (const componentName of componentNames) {
    await silentNg('generate', 'component', componentName);
  }

  // Generate app-shell
  await ng('g', 'app-shell');

  await noSilentNg('build', '--output-mode=server');

  const expects: Record<string, string> = {
    'index.html': 'home works!',
    'ssg/index.html': 'ssg works!',
    'ssg/one/index.html': 'ssg-with-params works!',
    'ssg/two/index.html': 'ssg-with-params works!',
  };

  for (const [filePath, fileMatch] of Object.entries(expects)) {
    await expectFileToMatch(join('dist/test-project/browser', filePath), fileMatch);
  }

  const filesDoNotExist: string[] = ['csr/index.html', 'ssr/index.html', 'redirect/index.html'];
  for (const filePath of filesDoNotExist) {
    const file = join('dist/test-project/browser', filePath);
    assert.equal(existsSync(file), false, `Expected '${file}' to not exist.`);
  }

  // Tests responses
  const responseExpects: Record<
    string,
    { headers: Record<string, string>; content: string; serverContext: string }
  > = {
    '/': {
      content: 'home works',
      serverContext: 'ng-server-context="ssg"',
      headers: {
        'x-custom': 'ssg',
      },
    },
    '/ssg': {
      content: 'ssg works!',
      serverContext: 'ng-server-context="ssg"',
      headers: {
        'x-custom': 'ssg',
      },
    },
    '/ssr': {
      content: 'ssr works!',
      serverContext: 'ng-server-context="ssr"',
      headers: {
        'x-custom': 'ssr',
      },
    },
    '/csr': {
      content: 'app-shell works',
      serverContext: 'ng-server-context="ssg"',
      headers: {
        'x-custom': 'csr',
      },
    },
    '/redirect': {
      content: 'ssg works!',
      serverContext: 'ng-server-context="ssg"',
      headers: {
        'x-custom': 'ssg',
      },
    },
  };

  const port = await spawnServer();
  for (const [pathname, { content, headers, serverContext }] of Object.entries(responseExpects)) {
    // NOTE: A global 'UND_ERR_SOCKET' may occur due to an incorrect Content-Length header value.
    const res = await fetch(`http://localhost:${port}${pathname}`);
    const text = await res.text();

    assert.match(
      text,
      new RegExp(content),
      `Response for '${pathname}': ${content} was not matched in content.`,
    );

    assert.match(
      text,
      new RegExp(serverContext),
      `Response for '${pathname}': ${serverContext} was not matched in content.`,
    );

    for (const [name, value] of Object.entries(headers)) {
      assert.equal(
        res.headers.get(name),
        value,
        `Response for '${pathname}': ${name} header value did not match expected.`,
      );
    }
  }
}

async function spawnServer(): Promise<number> {
  const port = await findFreePort();
  await execAndWaitForOutputToMatch(
    'npm',
    ['run', 'serve:ssr:test-project'],
    /Node Express server listening on/,
    {
      'PORT': String(port),
    },
  );

  return port;
}
