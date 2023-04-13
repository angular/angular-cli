import { silentNpm } from './process';
import { updateJsonFile } from './project';

/** Updates the `test` builder in the current workspace to use Jest with the given options. */
export async function applyJestBuilder(
  options: {} = {
    tsConfig: 'tsconfig.spec.json',
    polyfills: ['zone.js', 'zone.js/testing'],
  },
): Promise<void> {
  await silentNpm('install', 'jest@29.5.0', 'jest-environment-jsdom@29.5.0', '--save-dev');

  await updateJsonFile('angular.json', (json) => {
    const projects = Object.values(json['projects']);
    if (projects.length !== 1) {
      throw new Error(
        `Expected exactly one project but found ${projects.length} projects named ${Object.keys(
          json['projects'],
        ).join(', ')}`,
      );
    }
    const project = projects[0]! as any;

    // Update to Jest builder.
    const test = project['architect']['test'];
    test['builder'] = '@angular-devkit/build-angular:jest';
    test['options'] = options;
  });
}
