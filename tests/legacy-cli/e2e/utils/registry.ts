import { spawn } from 'child_process';
import { join } from 'path';
import { getGlobalVariable } from './env';
import { writeFile, readFile } from './fs';
import { mktempd } from './utils';

export async function createNpmRegistry(
  port: number,
  httpsPort: number,
  withAuthentication = false,
) {
  // Setup local package registry
  const registryPath = await mktempd('angular-cli-e2e-registry-');

  let configContent = await readFile(
    join(__dirname, '../../', withAuthentication ? 'verdaccio_auth.yaml' : 'verdaccio.yaml'),
  );
  configContent = configContent.replace(/\$\{HTTP_PORT\}/g, String(port));
  configContent = configContent.replace(/\$\{HTTPS_PORT\}/g, String(httpsPort));
  await writeFile(join(registryPath, 'verdaccio.yaml'), configContent);

  return spawn('node', [require.resolve('verdaccio/bin/verdaccio'), '-c', './verdaccio.yaml'], {
    cwd: registryPath,
    stdio: 'inherit',
  });
}

// Token was generated using `echo -n 'testing:s3cret' | openssl base64`.
const VALID_TOKEN = `dGVzdGluZzpzM2NyZXQ=`;

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
  const registry = (getGlobalVariable('package-secure-registry') as string).replace(/^\w+:/, '');

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
  process.env[registryKey] = getGlobalVariable('package-secure-registry');

  process.env['NPM_CONFIG__AUTH'] = invalidToken ? `invalid=` : VALID_TOKEN;

  // Needed for verdaccio when used with yarn
  // https://verdaccio.org/docs/en/cli-registry#yarn
  process.env['NPM_CONFIG_ALWAYS_AUTH'] = 'true';
}
