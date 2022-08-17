import { getGlobalVariable } from './env';
import { ProcessOutput, silentNpm, silentYarn } from './process';

export interface PkgInfo {
  readonly name: string;
  readonly version: string;
  readonly path: string;
}

export function getActivePackageManager(): 'npm' | 'yarn' {
  const value = getGlobalVariable('package-manager');
  if (value && value !== 'npm' && value !== 'yarn') {
    throw new Error('Invalid package manager value: ' + value);
  }

  return value || 'npm';
}

export async function installWorkspacePackages(options?: { force?: boolean }): Promise<void> {
  switch (getActivePackageManager()) {
    case 'npm':
      const npmArgs = ['install'];
      if (options?.force) {
        npmArgs.push('--force');
      }
      await silentNpm(...npmArgs);
      break;
    case 'yarn':
      await silentYarn();
      break;
  }
}

export async function installPackage(specifier: string, registry?: string): Promise<ProcessOutput> {
  const registryOption = registry ? [`--registry=${registry}`] : [];
  switch (getActivePackageManager()) {
    case 'npm':
      return silentNpm('install', specifier, ...registryOption);
    case 'yarn':
      return silentYarn('add', specifier, ...registryOption);
  }
}

export async function uninstallPackage(name: string): Promise<ProcessOutput> {
  switch (getActivePackageManager()) {
    case 'npm':
      return silentNpm('uninstall', name);
    case 'yarn':
      return silentYarn('remove', name);
  }
}

export async function setRegistry(useTestRegistry: boolean): Promise<void> {
  const url = useTestRegistry
    ? getGlobalVariable('package-registry')
    : 'https://registry.npmjs.org';

  // Ensure local test registry is used when outside a project
  // Yarn supports both `NPM_CONFIG_REGISTRY` and `YARN_REGISTRY`.
  process.env['NPM_CONFIG_REGISTRY'] = url;
}
