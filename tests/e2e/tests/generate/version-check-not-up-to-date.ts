import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default function () {
  return updateJsonFile('node_modules/@angular/cli/package.json', (json) => {
      json.version = '1.0.0';
    })
    .then(() => ng('generate', 'component', 'basic'))
    .then(({ stdout }) => {
      if (!stdout.match(/is out of date/)) {
        throw new Error(`Expected to match "is out of date" in ${stdout}.`);
      }
    });
}
