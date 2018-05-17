import { expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';

export default function() {
  return Promise.resolve()
    .then(() => ng('config', 'projects.test-project.architect.serve.options.port', '1234'))
    .then(() => expectFileToMatch('angular.json', /"port": 1234/));
}
