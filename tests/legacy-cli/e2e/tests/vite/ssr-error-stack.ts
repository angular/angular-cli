import { doesNotMatch, match } from 'node:assert';
import { ng } from '../../utils/process';
import { appendToFile, rimraf } from '../../utils/fs';
import { ngServe, useSha } from '../../utils/project';
import { installWorkspacePackages } from '../../utils/packages';

export default async function () {
  // Forcibly remove in case another test doesn't clean itself up.
  await rimraf('node_modules/@angular/ssr');
  await ng('add', '@angular/ssr', '--server-routing', '--skip-confirmation');
  await useSha();
  await installWorkspacePackages();

  // Create Error.
  await appendToFile(
    'src/app/app.component.ts',
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
    /something happened.+at eval \(.+[\\/]+e2e-test[\\/]+test-project[\\/]+src[\\/]+app[\\/]+app\.component\.ts:\d+:\d+\)/,
  );
  doesNotMatch(text, /vite-root/);
}
