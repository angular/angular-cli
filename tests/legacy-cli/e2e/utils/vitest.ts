import { silentNpm } from './process';
import { updateJsonFile } from './project';

/** Updates the `test` builder in the current workspace to use Vitest. */
export async function applyVitestBuilder(): Promise<void> {
  // These deps matches the deps in `@schematics/angular`
  await silentNpm('install', 'vitest@^4.0.8', 'jsdom@^27.1.0', '--save-dev');

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
    test['options'] = {};
  });

  await updateJsonFile('tsconfig.spec.json', (tsconfig) => {
    tsconfig['compilerOptions']['types'] = ['vitest/globals'];
  });
}
