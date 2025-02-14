import * as fs from 'node:fs';
import * as semver from 'semver';

export function readNgVersion(): string {
  const packageJson: any = JSON.parse(
    fs.readFileSync('./node_modules/@angular/core/package.json', 'utf8'),
  ) as { version: string };
  return packageJson['version'];
}

export function ngVersionMatches(range: string): boolean {
  return semver.satisfies(readNgVersion(), range);
}
