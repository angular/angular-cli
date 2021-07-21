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

// Token was generated using `echo -n 'testing:s3cret' | openssl base64`.
const VALID_TOKEN = `dGVzdGluZzpzM2NyZXQ=`;
const SECURE_REGISTRY = `//localhost:4876/`;

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
  const token = invalidToken ? `invalid=` : VALID_TOKEN;
  const registry = SECURE_REGISTRY;

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

export function setNpmEnvVarsForAuthentication(
  /** When true, an incorrect token is used. Use this to validate authentication failures. */
  invalidToken = false,
  /** When true, `YARN_REGISTRY` is used instead of `NPM_CONFIG_REGISTRY`. */
  useYarnEnvVariable = false,
): void {
  delete process.env['YARN_REGISTRY'];
  delete process.env['NPM_CONFIG_REGISTRY'];

  const registryKey = useYarnEnvVariable ? 'YARN_REGISTRY' : 'NPM_CONFIG_REGISTRY';
  process.env[registryKey] = `http:${SECURE_REGISTRY}`;

  process.env['NPM_CONFIG__AUTH'] = invalidToken ? `invalid=` : VALID_TOKEN;

  // Needed for verdaccio when used with yarn
  // https://verdaccio.org/docs/en/cli-registry#yarn
  process.env['NPM_CONFIG_ALWAYS_AUTH'] = 'true';
}
