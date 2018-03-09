import { DocTask } from '../tasks/doc';
import { Command } from '../models/command';

export interface DocOptions {
  search?: boolean;
}

export default class DocCommand extends Command {
  public readonly name = 'doc';
  public readonly description = 'Opens the official Angular API documentation for a given keyword.';
  public static aliases = ['d'];
  public readonly arguments = ['keyword'];
  public readonly options = [
    {
      name: 'search',
      aliases: ['s'],
      type: Boolean,
      default: false,
      description: 'Search whole angular.io instead of just api.'
    }
  ];

  public async run(options: any) {
    const keyword = options.keyword;

    const docTask = new DocTask({
      ui: this.ui,
      project: this.project
    });

    return await docTask.run(keyword, options.search);
  }
}
