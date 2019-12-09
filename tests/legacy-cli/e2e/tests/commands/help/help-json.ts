import { silentNg } from '../../../utils/process';
import { deleteFile } from '../../../utils/fs';

export default async function() {
  const commands = require('@angular/cli/commands.json');

  async function execCommands(commands: string[]) {
    for (const commandName of commands) {
      const { stdout } = await silentNg(commandName, '--help=json');

      if (stdout.trim()) {
        JSON.parse(stdout);
      } else {
        console.warn(`No JSON output for command [${commandName}].`);
      }
    }
  }

  const commandsToRunInAProject = Object.keys(commands).filter(commandName => commandName !== 'new');
  // `ng new` is the only command that's required to run outside of an Angular project
  const commandsToRunOutsideOfAProject = ['new'];

  await execCommands(commandsToRunInAProject);
  // Remove `angular.json` to ensure `ng new` is runnable in the same directory
  await deleteFile('angular.json');
  await execCommands(commandsToRunOutsideOfAProject);
}
