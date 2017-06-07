import { ng } from '../../utils/process';

export default function () {
  return ng('generate', 'component', 'basic')
    .then(({ stdout }) => {
      if (stdout.match(/is out of date/)) {
        throw new Error(`Expected to not match "is out of date" in ${stdout}.`);
      }
    });
}
