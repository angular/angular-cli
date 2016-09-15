import {silentNg} from '../../utils/process';


export default function() {
  const projectDir = process.cwd();
  return Promise.resolve()
    .then(() => silentNg('help'))
    .then(() => process.chdir('/'))
    .then(() => silentNg('help'))
    .then(() => process.chdir(projectDir));
}
