import { ng } from '../../utils/process';
import { expectFileToMatch } from '../../utils/fs';


export default async function() {
  await ng('build', '--build-event-log', 'bep-log.txt');

  await expectFileToMatch('bep-log.txt', '{"id":{"started":{}},"started":{"command":"build",');
  await expectFileToMatch('bep-log.txt', '{"id":{"finished":{}},"finished":{"finish_time_millis":');
}
