import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';


export default function() {
  // Try a prod build.
  return Promise.resolve()
    .then(() => updateJsonFile('angular.json', configJson => {
      const appArchitect = configJson.projects['test-project'].architect;
      appArchitect.build.configurations['prod-env'] = {
        fileReplacements: [
          {
            src: 'src/environments/environment.ts',
            replaceWith: 'src/environments/environment.prod.ts',
          }
        ],
      };
    }))
    .then(() => ng('build', '--configuration=prod-env'))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js', /production:\s*true/))
    .then(() => expectFileToMatch('dist/test-project/main-es2015.js', /production:\s*true/));
}
