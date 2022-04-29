import glob from 'glob';
import { promisify } from 'util';
import { readFile } from '../../utils/fs';

const globAsync = promisify(glob);

const CURRENT_SCRIPT_PACKAGES: ReadonlySet<string> = new Set([
  'esbuild (postinstall)',
  'nice-napi (install)',
]);

const POTENTIAL_SCRIPTS: ReadonlyArray<string> = ['preinstall', 'install', 'postinstall'];

// Some packages include test and/or example code that causes false positives
const FALSE_POSITIVE_PATHS: ReadonlySet<string> = new Set([
  'node_modules/jasmine-spec-reporter/examples/protractor/package.json',
  'node_modules/resolve/test/resolver/multirepo/package.json',
]);

export default async function () {
  const manifestPaths = await globAsync('node_modules/**/package.json');
  const newPackages: string[] = [];

  for (const manifestPath of manifestPaths) {
    if (FALSE_POSITIVE_PATHS.has(manifestPath)) {
      continue;
    }

    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath));
    } catch {
      continue;
    }

    if (!manifest.scripts) {
      continue;
    }

    for (const script of POTENTIAL_SCRIPTS) {
      if (!manifest.scripts[script]) {
        continue;
      }

      const packageScript = `${manifest.name} (${script})`;

      if (!CURRENT_SCRIPT_PACKAGES.has(packageScript)) {
        newPackages.push(packageScript + `[${manifestPath}]`);
      }
    }
  }

  if (newPackages.length) {
    throw new Error(
      'New install script package(s) detected:\n' + JSON.stringify(newPackages, null, 2),
    );
  }
}
