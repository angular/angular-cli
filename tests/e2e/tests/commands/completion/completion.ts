import {silentNg} from '../../../utils/process';


export default function() {
  return Promise.resolve()
    .then(() => silentNg('completion'))
    .then(() => process.chdir('/'))
    .then(() => silentNg('completion'));
}
