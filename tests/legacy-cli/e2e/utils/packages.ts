import { getGlobalVariable } from './env';
import { ProcessOutput, silentNpm, silentYarn } from './process';

export function getActivePackageManager(): 'npm' | 'yarn' {
  const value = getGlobalVariable('package-manager');
  if (value && value !== 'npm' && value !== 'yarn') {
    throw new Error('Invalid package manager value: ' + value);
  }

  return value || 'npm';
}

export async function installWorkspacePackages(updateWebdriver = true): Promise<void> {
  switch (getActivePackageManager()) {
    case 'npm':
      await silentNpm('install');
      if (updateWebdriver) {
        await silentNpm('run', 'webdriver-update');
      }
      break;
    case 'yarn':
      await silentYarn();
      if (updateWebdriver) {
        await silentYarn('webdriver-update');
      }
      break;
  }
}

export async function installPackage(specifier: string): Promise<ProcessOutput> {
  switch (getActivePackageManager()) {
    case 'npm':
      return silentNpm('install', specifier);
    case 'yarn':
      return silentYarn('add', specifier);
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
