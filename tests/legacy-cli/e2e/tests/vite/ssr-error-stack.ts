import { doesNotMatch, match } from 'node:assert';
import { ng } from '../../utils/process';
import { appendToFile, rimraf } from '../../utils/fs';
import { ngServe, useSha } from '../../utils/project';
import { installWorkspacePackages } from '../../utils/packages';
import { getGlobalVariable } from '../../utils/env';

export default async function () {
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];

  // Forcibly remove in case another test doesn't clean itself up.
  await rimraf('node_modules/@angular/ssr');
  if (useWebpackBuilder) {
    // `--server-routing` not supported in `browser` builder.
    await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');
  } else {
    await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');
  }

  await useSha();
  await installWorkspacePackages();

  // Create Error.
  await appendToFile(
    'src/app/app.ts',
    `
      (() => {
        throw new Error('something happened!');
      })();
      `,
  );

  const port = await ngServe();
  const response = await fetch(`http://localhost:${port}/`);
  const text = await response.text();

  // The error is also sent in the browser, so we don't need to scrap the stderr.
  match(
    text,
    /something happened.+at eval \(.+[\\/]+e2e-test[\\/]+test-project[\\/]+src[\\/]+app[\\/]+app\.ts:\d+:\d+\)/,
  );
  doesNotMatch(text, /vite-root/);
}
