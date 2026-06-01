import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import { getGlobalVariable } from '../../../utils/env';
import { expectFileToExist, expectFileNotToExist, rimraf } from '../../../utils/fs';
import { getActivePackageManager } from '../../../utils/packages';
import { ng, silentNpm } from '../../../utils/process';
import { mktempd } from '../../../utils/utils';

export default async function () {
  const testRegistry = getGlobalVariable('package-registry');
  const tmpRoot = getGlobalVariable('tmp-root');

  // 1. Create a temp directory for the custom package
  const pkgDir = await mktempd('registry-stripped-pkg-', tmpRoot);

  try {
    // 2. Write the package files
    const packageJson = {
      name: '@angular-devkit/ng-add-registry-stripped',
      version: '1.0.0',
      schematics: './collection.json',
      'ng-add': {
        save: false,
      },
    };

    const collectionJson = {
      schematics: {
        'ng-add': {
          factory: './index.js',
          description: 'Add test empty file to your application.',
        },
      },
    };

    const indexJs = `
      exports.default = function() {
        return function(tree) {
          tree.create('schematic-executed-successfully.txt', 'Registry Stripped schematic works!');
          return tree;
        };
      };
    `;

    await fs.writeFile(join(pkgDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    await fs.writeFile(join(pkgDir, 'collection.json'), JSON.stringify(collectionJson, null, 2));
    await fs.writeFile(join(pkgDir, 'index.js'), indexJs);

    // Write a temporary .npmrc with a fake authentication token so that npm publish succeeds
    // without needing real credentials or throwing ENEEDAUTH.
    const npmrcContent = `
${testRegistry.replace(/^https?:/, '')}/:_authToken=fake-secret
registry=${testRegistry}
`;
    await fs.writeFile(join(pkgDir, '.npmrc'), npmrcContent);

    // 3. Pack the package
    const packResult = await silentNpm(['pack'], { cwd: pkgDir });
    const tarballName = packResult.stdout.trim().split('\n').pop() || '';

    // 4. Publish the package to the local verdaccio registry
    // Verdaccio has publish: $all for @angular-devkit/* so this will succeed
    await silentNpm(['publish'], { cwd: pkgDir });

    // 5. Strip "schematics" and "ng-add" from Verdaccio's metadata on disk
    const verdaccioDbPath = join(
      tmpRoot,
      'registry',
      'storage',
      '@angular-devkit',
      'ng-add-registry-stripped',
      'package.json',
    );

    const verdaccioDb = JSON.parse(await fs.readFile(verdaccioDbPath, 'utf-8'));

    // Strip from the top-level versions list
    if (verdaccioDb.versions) {
      for (const versionKey of Object.keys(verdaccioDb.versions)) {
        delete verdaccioDb.versions[versionKey].schematics;
        delete verdaccioDb.versions[versionKey]['ng-add'];
      }
    }

    // Write back the modified metadata
    await fs.writeFile(verdaccioDbPath, JSON.stringify(verdaccioDb, null, 2), 'utf-8');

    // 6. Execute `ng add` on the registry-stripped package
    // Ensure file doesn't already exist
    await expectFileNotToExist('schematic-executed-successfully.txt');

    await ng('add', '@angular-devkit/ng-add-registry-stripped', '--skip-confirmation');

    // 7. Assertions
    // A. The schematic executed successfully
    await expectFileToExist('schematic-executed-successfully.txt');

    // B. The dependency was pruned from package.json since save: false
    const rootPackageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
    const hasDep =
      (rootPackageJson.dependencies &&
        rootPackageJson.dependencies['@angular-devkit/ng-add-registry-stripped']) ||
      (rootPackageJson.devDependencies &&
        rootPackageJson.devDependencies['@angular-devkit/ng-add-registry-stripped']);

    if (hasDep) {
      throw new Error(
        'Package @angular-devkit/ng-add-registry-stripped was not cleaned up from package.json dependencies!',
      );
    }

    // C. The dependency was pruned from node_modules physical folder
    // Bun intentionally does not prune unreferenced packages from node_modules automatically.
    if (getActivePackageManager() !== 'bun') {
      await expectFileNotToExist('node_modules/@angular-devkit/ng-add-registry-stripped');
    }
  } finally {
    // Cleanup temp package source folder
    await rimraf(pkgDir);
  }
}
