const Command = require('../ember-cli/lib/models/command');

const InitCommand: any = Command.extend({
  name: 'init',
  description: 'Creates a new Angular CLI project in the current folder.',
  works: 'everywhere',
  hidden: true,

  availableOptions: [
    { name: 'dry-run', type: Boolean, default: false, aliases: ['d'] },
    { name: 'verbose', type: Boolean, default: false, aliases: ['v'] },
    { name: 'link-cli', type: Boolean, default: false, aliases: ['lc'] },
    { name: 'skip-install', type: Boolean, default: false, aliases: ['si'] },
    { name: 'skip-git', type: Boolean, default: false, aliases: ['sg'] },
    { name: 'skip-tests', type: Boolean, default: false, aliases: ['st'] },
    { name: 'skip-commit', type: Boolean, default: false, aliases: ['sc'] },
    { name: 'name', type: String, default: '', aliases: ['n'] },
    { name: 'source-dir', type: String, default: 'src', aliases: ['sd'] },
    { name: 'style', type: String, default: 'css' },
    { name: 'prefix', type: String, default: 'app', aliases: ['p'] },
    { name: 'routing', type: Boolean, default: false },
    { name: 'inline-style', type: Boolean, default: false, aliases: ['is'] },
    { name: 'inline-template', type: Boolean, default: false, aliases: ['it'] },
    {
      name: 'minimal',
      type: Boolean,
      default: false,
      description: 'Should create a minimal app.'
     }
  ],

  anonymousOptions: ['<glob-pattern>'],

  run: function (commandOptions: any, rawArgs: string[]) {
    const InitTask = require('../tasks/init').default;

    const initTask = new InitTask({
      project: this.project,
      tasks: this.tasks,
      ui: this.ui,
    });

    return initTask.run(commandOptions, rawArgs);
  }
});

InitCommand.overrideCore = true;
export default InitCommand;
