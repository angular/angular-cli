import { SemVer } from 'semver';
import { getGlobalVariable } from '../../utils/env';
import { readFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';


export default async function () {
  if (getGlobalVariable('argv')['ng-snapshots']) {
    // The snapshots job won't work correctly because it doesn't use semver for Angular.
    return;
  }

  const angularCliPkgJson = JSON.parse(await readFile('node_modules/@angular/cli/package.json'));
  const cliMajor = new SemVer(angularCliPkgJson.version as string).major;
  const angularCorePkgPath = 'node_modules/@angular/core/package.json';
  const originalAngularCorePkgJson = await readFile(angularCorePkgPath);

  // Fake version by writing over the @angular/core version, since that's what the CLI checks.
  const fakeCoreVersion = async (newMajor: number) => {
    const tmpPkgJson = JSON.parse(originalAngularCorePkgJson);
    tmpPkgJson.version = `${newMajor}.0.0`;
    await writeFile(angularCorePkgPath, JSON.stringify(tmpPkgJson));
  };

  // Major should succeed, but we don't need to test it here since it's tested everywhere else.
  // Major+1 and -1 should fail architect commands, but allow other commands.
  await fakeCoreVersion(cliMajor + 1);
  await expectToFail(() => ng('build'), 'Should fail Major+1');
  await ng('version');
  await fakeCoreVersion(cliMajor - 1);
  await ng('version');

  // Restore the original core package.json.
  await writeFile(angularCorePkgPath, originalAngularCorePkgJson);
}
