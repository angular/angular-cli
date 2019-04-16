import { silentNg } from '../../../utils/process';


export default async function() {
  // We can't generate help for the deploy command because there is no default deploy builder.
  const excludedCommands = ['deploy'];
  const commands = require('@angular/cli/commands.json');
  for (const commandName of Object.keys(commands).filter(c => !excludedCommands.includes(c))) {
    const { stdout } = await silentNg(commandName, '--help=json');

    if (stdout.trim()) {
      JSON.parse(stdout);
    } else {
      console.warn(`No JSON output for command [${commandName}].`);
    }
  }
}
