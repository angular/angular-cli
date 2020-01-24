import { getGlobalVariable } from '../../utils/env';
import { ng, silentNpm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

const snapshots = require('../../ng-snapshot/package.json');

export default async function () {
    await ng('add', '@angular/material');

    const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];
    if (isSnapshotBuild) {
        await updateJsonFile('package.json', packageJson => {
            const dependencies = packageJson['dependencies'];
            // Angular material adds dependencies on other Angular packages
            // Iterate over all of the packages to update them to the snapshot version.
            for (const [name, version] of Object.entries(snapshots.dependencies)) {
                if (name in dependencies) {
                    dependencies[name] = version;
                }
            }
        });
    }

    await silentNpm('install');
    await ng('build', '--prod');
}
