import { ChildProcess, spawn } from 'child_process';
import { copyFileSync, mkdtempSync, realpathSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile } from './fs';

export function createNpmRegistry(withAuthentication = false): ChildProcess {
  // Setup local package registry
  const registryPath = mkdtempSync(join(realpathSync(tmpdir()), 'angular-cli-e2e-registry-'));

  copyFileSync(
    join(__dirname, '../../', withAuthentication ? 'verdaccio_auth.yaml' : 'verdaccio.yaml'),
    join(registryPath, 'verdaccio.yaml'),
  );

  return spawn('node', [require.resolve('verdaccio/bin/verdaccio'), '-c', './verdaccio.yaml'], {
    cwd: registryPath,
    stdio: 'inherit',
  });
}

export function createNpmConfigForAuthentication(
  /**
   * When true, the authentication token will be scoped to the registry URL.
   * @example
   * ```ini
   * //localhost:4876/:_auth="dGVzdGluZzpzM2NyZXQ="
   * ```
   *
   * When false, the authentication will be added as seperate key.
   * @example
   * ```ini
   * _auth="dGVzdGluZzpzM2NyZXQ="`
   * ```
   */
  scopedAuthentication: boolean,
  /** When true, an incorrect token is used. Use this to validate authentication failures. */
  invalidToken = false,
): Promise<void> {
  // Token was generated using `echo -n 'testing:s3cret' | openssl base64`.
  const token = invalidToken ? `invalid=` : `dGVzdGluZzpzM2NyZXQ=`;
  const registry = `//localhost:4876/`;

  return writeFile(
    '.npmrc',
    scopedAuthentication
      ? `
        ${registry}:_auth="${token}"
        registry=http:${registry}
      `
      : `
        _auth="${token}"
        registry=http:${registry}
      `,
  );
}
