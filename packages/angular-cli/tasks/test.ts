const Task = require('ember-cli/lib/models/task');
import * as path from 'path';

export default Task.extend({
  run: function (options: any) {
    const projectRoot = this.project.root;
    return new Promise((resolve) => {
      const karma = require('karma');
      const karmaConfig = path.join(projectRoot, this.project.ngConfig.config.test.karma.config);

      // Convert browsers from a string to an array
      if (options.browsers) {
        options.browsers = options.browsers.split(',');
      }

      // Assign additional karmaConfig options to the local ngapp config
      options.configFile = karmaConfig;

      // :shipit:
      const karmaServer = new karma.Server(options, resolve);
      karmaServer.start();
    });
  }
});
