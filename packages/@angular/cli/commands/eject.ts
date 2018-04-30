import { tags } from '@angular-devkit/core';
import { Command, Option } from '../models/command';


export default class EjectCommand extends Command {
  public readonly name = 'eject';
  public readonly description = 'Temporarily disabled. Ejects your app and output the proper '
                              + 'webpack configuration and scripts.';
  public readonly arguments: string[] = [];
  public readonly options: Option[] = [];

  run() {
    this.logger.info(tags.stripIndents`
      The 'eject' command has been temporarily disabled, as it is not yet compatible with the new
      angular.json format. The new configuration format provides further flexibility to modify the
      configuration of your workspace without ejecting. Ejection will be re-enabled in a future
      release of the CLI.

      If you need to eject today, use CLI 1.7 to eject your project.
    `);
  }
}
