import { silentNg } from '../../../utils/process';


export default async function() {
  const commands = require('@angular/cli/commands.json');
  for (const commandName of Object.keys(commands)) {
    const { stdout } = await silentNg(commandName, '--help=json');

    if (stdout.trim()) {
      JSON.parse(stdout);
    } else {
      console.warn(`No JSON output for command [${commandName}].`);
    }
  }
}
