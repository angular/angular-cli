import {silentNg} from '../../../utils/process';


export default function() {
  return Promise.resolve()
    .then(() => silentNg('help'))
    .then(() => process.chdir('/'))
    .then(() => silentNg('help'));
}
