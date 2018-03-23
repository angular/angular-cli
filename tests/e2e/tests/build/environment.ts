import {ng} from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';


export default function() {
  // Try a prod build.
  return Promise.resolve()
    .then(() => updateJsonFile('angular.json', configJson => {
      const appArchitect = configJson.projects['test-project'].architect;
      appArchitect.build.configurations['prod-env'] = {
        fileReplacements: [
          {
            from: 'projects/test-project/src/environments/environment.ts',
            to: 'projects/test-project/src/environments/environment.prod.ts'
          }
        ],
      };
    }))
    .then(() => ng('build', '--configuration=prod-env'))
    .then(() => expectFileToMatch('dist/test-project/main.js', 'production: true'));
}
