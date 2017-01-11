import {Logger} from '@ngtools/logger';
import * as fs from 'fs';
import * as path from 'path';
import {SemVer} from 'semver';

export default function patch(args: string[], opts: any, logger: Logger): void {
  const newVersion = args[0];
  const incFn = opts.patch ? (v: SemVer) => v.inc('patch') : (v: SemVer) => v;

  if (!newVersion) {
    logger.fatal('Need to pass in a new version.');
    return;
  }

  const { packages } = require('../../../lib/packages');
  const rootPackageJson = path.join(__dirname, '../../../package.json');

  for (const packageName of Object.keys(packages)) {
    if (packageName == 'angular-cli') {
      // Skip the main package.
      continue;
    }

    const pkgJson = require(packages[packageName].packageJson);
    const version = new SemVer(pkgJson['version']);
    const oldVersion = version.toString();

    pkgJson['version'] = incFn(version).toString();
    fs.writeFileSync(packages[packageName].packageJson, JSON.stringify(pkgJson, null, 2) + '\n');

    logger.info(`${packageName}: ${oldVersion} => ${pkgJson['version']}`);
  }

  // Do the main package.
  const angularCliPackageJson = require(rootPackageJson);
  angularCliPackageJson['version'] = newVersion;
  fs.writeFileSync(rootPackageJson, JSON.stringify(angularCliPackageJson, null, 2) + '\n');
}
