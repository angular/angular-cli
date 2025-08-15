import { silentNpm } from './process';
import { updateJsonFile } from './project';

/** Updates the `test` builder in the current workspace to use Vitest. */
export async function applyVitestBuilder(): Promise<void> {
  await silentNpm('install', 'vitest@3.2.4', 'jsdom@26.1.0', '--save-dev');

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

    // Update to Vitest builder.
    const test = project['architect']['test'];
    test['builder'] = '@angular/build:unit-test';
    test['options'] = {
      tsConfig: test['options']['tsConfig'],
      buildTarget: '::development',
      runner: 'vitest',
    };
  });
}
