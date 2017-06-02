import {ng} from '../../../utils/process';
import {createProject} from '../../../utils/project';
import { getGlobalVariable } from '../../../utils/env';


export default function() {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => createProject('routing-project', '--routing'))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
