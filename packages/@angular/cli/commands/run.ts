import { Command, Option } from '../models/command';
import { runTarget } from '../utilities/architect';

export default class RunCommand extends Command {
  public readonly name = 'run';
  public readonly description = 'Runs an architect configuration.';
  public readonly arguments: string[] = ['config'];
  public readonly options: Option[] = [];

  public async run(options: any) {
    const buildEvent = await runTarget(this.project.root, options.config, options)
      .toPromise();
    if (!buildEvent.success) {
      throw new Error('');
    }
  }
}
