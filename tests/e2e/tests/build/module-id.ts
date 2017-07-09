import { ng } from '../../utils/process';
import { replaceInFile } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';


export default function() {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => replaceInFile('src/app/app.component.ts',
      '@Component({',
      '@Component({ moduleId: module.id,'))
    .then(() => ng('build'));
}
