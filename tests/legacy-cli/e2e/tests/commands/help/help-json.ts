import { silentNg } from '../../../utils/process';


export default async function() {
  const commands = require('@angular/cli/commands.json');
  for (const commandName of Object.keys(commands)) {
    const { stdout } = await silentNg(commandName, '--help=json');

    if (stdout.trim()) {
      JSON.parse(stdout, (key, value) => {
        if (key === 'name' && /[A-Z]/.test(value)) {
          throw new Error(`Option named '${value}' is not kebab case.`);
        }
      });
    } else {
      console.warn(`No JSON output for command [${commandName}].`);
    }
  }
}
