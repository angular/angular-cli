import { Command, Option } from '../models/command';
import chalk from 'chalk';

const { cyan } = chalk;

export default class HelpCommand extends Command {
  public readonly name = 'help';
  public readonly description = 'Help.';
  public readonly arguments: string[] = [];
  public readonly options: Option[] = [];

  run(options: any) {
    const commands = Object.keys(options.commandMap)
      .map(key => {
        const Cmd = options.commandMap[key];
        const command: Command = new Cmd(null, null);
        return command;
      })
      .filter(cmd => !cmd.hidden && !cmd.unknown)
      .map(cmd => ({
        name: cmd.name,
        description: cmd.description
      }));
    this.logger.info(`Available Commands:`);
    commands.forEach(cmd => {
      this.logger.info(`  ${cyan(cmd.name)} ${cmd.description}`);
    });

    this.logger.info(`\nFor more detailed help run "ng [command name] --help"`);
  }

  printHelp(options: any) {
    return this.run(options);
  }
}
