import { requireProjectModule } from '../utilities/require-project-module';
import { join } from 'path';

const fs = require('fs');
const Task = require('../ember-cli/lib/models/task');

export interface RenderUniversalTaskOptions {
  inputIndexPath: string;
  route: string;
  serverOutDir: string;
  outputIndexPath: string;
}

export default Task.extend({
  run: function(options: RenderUniversalTaskOptions): Promise<any> {
    requireProjectModule(this.project.root, 'zone.js/dist/zone-node');

    const renderModuleFactory =
      requireProjectModule(this.project.root, '@angular/platform-server').renderModuleFactory;

    // Get the main bundle from the server build's output directory.
    const serverDir = fs.readdirSync(options.serverOutDir);
    const serverMainBundle = serverDir
      .filter((file: string) => /main\.(?:[a-zA-Z0-9]{20}\.)?js/.test(file))[0];
    const serverBundlePath = join(options.serverOutDir, serverMainBundle);
    const AppServerModuleNgFactory = require(serverBundlePath).AppServerModuleNgFactory;

    const index = fs.readFileSync(options.inputIndexPath, 'utf8');
    // Render to HTML and overwrite the client index file.
    return renderModuleFactory(AppServerModuleNgFactory, {document: index, url: options.route})
      .then((html: string) => fs.writeFileSync(options.outputIndexPath, html));
  }
});
