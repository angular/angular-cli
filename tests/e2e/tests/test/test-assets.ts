import { writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { stripIndent } from 'common-tags';

// Make sure asset files are served
export default function () {
  // TODO(architect): Figure out why this test is not working.
  return;

  return Promise.resolve()
    .then(() => writeMultipleFiles({
      'projects/test-project/src/assets/file.txt': 'assets-folder-content',
      'projects/test-project/src/file.txt': 'file-content',
      // Not using `async()` in tests as it seemed to swallow `fetch()` errors
      'projects/test-project/src/app/app.component.spec.ts': stripIndent`
        describe('Test Runner', () => {
          const fetch = global['fetch'];
          it('should serve files in assets folder', (done) => {
            fetch('/assets/file.txt')
              .then(response => response.text())
              .then(fileText => {
                expect(fileText).toMatch('assets-folder-content');
                done();
              });
          });
          it('should serve files explicitly added to assets array', (done) => {
            fetch('/file.txt')
              .then(response => response.text())
              .then(fileText => {
                expect(fileText).toMatch('file-content');
                done();
              });
          });
        });
      `
    }))
    // Test failure condition (no assets in angular.json)
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.assets = [];
    }))
    .then(() => expectToFail(() => ng('test', '--watch=false'),
      'Should fail because the assets to serve were not in the Angular CLI config'))
    // Test passing condition (assets are included)
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.assets = [
        { 'glob': '**/*', 'input': 'projects/test-project/src/assets' },
        { 'glob': 'file.txt' },
      ];
    }))
    .then(() => ng('test', '--watch=false'));
}
