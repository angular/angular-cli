import { getGlobalVariable } from './env';
import { ProcessOutput, silentNpm, silentYarn } from './process';

export function getActivePackageManager(): 'npm' | 'yarn' {
  const value = getGlobalVariable('package-manager');
  if (value && value !== 'npm' && value !== 'yarn') {
    throw new Error('Invalid package manager value: ' + value);
  }

  return value || 'npm';
}

export async function installWorkspacePackages(): Promise<void> {
  switch (getActivePackageManager()) {
    case 'npm':
      await silentNpm('install');
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
