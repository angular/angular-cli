import { silentNpm } from './process';
import { updateJsonFile } from './project';

/** Updates the `test` builder in the current workspace to use Web Test Runner with the given options. */
export async function applyWtrBuilder(): Promise<void> {
  await silentNpm('install', '@web/test-runner', '--save-dev');

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

    // Update to Web Test Runner builder.
    const test = project['architect']['test'];
    test['builder'] = '@angular-devkit/build-angular:web-test-runner';
  });
}
