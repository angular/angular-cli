import { match } from 'node:assert';
import { createProjectFromAsset } from '../../utils/assets';
import {
  expectFileMatchToExist,
  expectFileNotToExist,
  expectFileToExist,
  expectFileToMatch,
} from '../../utils/fs';
import { execAndWaitForOutputToMatch, ng, noSilentNg } from '../../utils/process';
import { findFreePort } from '../../utils/network';

export default async function () {
  await createProjectFromAsset('ssr-project-webpack', false, false);
  await ng('update', `@angular/cli`, '--name=use-application-builder');

  await Promise.all([
    expectFileNotToExist('tsconfig.server.json'),
    expectFileToMatch('tsconfig.json', 'esModuleInterop'),
    expectFileToMatch('src/server.ts', 'import.meta.url'),
  ]);

  // Verify project now creates bundles
  await noSilentNg('build', '--configuration=production');

  await Promise.all([
    expectFileToExist('dist/ssr-project-webpack/server/server.mjs'),
    expectFileMatchToExist('dist/ssr-project-webpack/browser', /main-[a-zA-Z0-9]{8}\.js/),
  ]);

  // Verify that the app runs
  const port = await findFreePort();
  await execAndWaitForOutputToMatch('ng', ['serve', '--port', String(port)], /complete\./);
  const response = await fetch(`http://localhost:${port}/`);
  const text = await response.text();
  match(text, /app is running!/);
}
