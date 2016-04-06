import * as existsSync from '../utilities/exists-sync';
import * as path from 'path';
import * as LiveReloadServer from 'ember-cli/lib/tasks/server/livereload-server';
import * as ExpressServer from 'ember-cli/lib/tasks/server/express-server';
import * as Task from 'ember-cli/lib/models/task';
import * as Watcher from 'ember-cli/lib/models/watcher';
import * as Builder from './builder';
import * as ServerWatcher from 'ember-cli/lib/models/server-watcher';

module.exports = Task.extend({
  run: function(options) {
    var builder = new Builder({
      ui: this.ui,
      outputPath: options.outputPath,
      project: this.project,
      environment: options.environment
    });

    var watcher = new Watcher({
      ui: this.ui,
      builder: builder,
      analytics: this.analytics,
      options: options
    });

    var serverRoot = './server';
    var serverWatcher = null;
    if (existsSync(serverRoot)) {
      serverWatcher = new ServerWatcher({
        ui: this.ui,
        analytics: this.analytics,
        watchedDir: path.resolve(serverRoot)
      });
    }

    var expressServer = new ExpressServer({
      ui: this.ui,
      project: this.project,
      watcher: watcher,
      serverRoot: serverRoot,
      serverWatcher: serverWatcher
    });

    var liveReloadServer = new LiveReloadServer({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project,
      watcher: watcher,
      expressServer: expressServer
    });

    return Promise.all([
      liveReloadServer.start(options),
      expressServer.start(options)
    ]).then(function() {
      return new Promise(function() {
        // hang until the user exits.
      });
    });
  }
});
