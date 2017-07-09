import * as url from 'url';
import { stripIndents } from 'common-tags';

import { E2eTaskOptions } from '../commands/e2e';
import { CliConfig } from '../models/config';
import { requireProjectModule } from '../utilities/require-project-module';

const Task = require('../ember-cli/lib/models/task');
const SilentError = require('silent-error');


export const E2eTask = Task.extend({
  run: function (e2eTaskOptions: E2eTaskOptions) {
    const projectConfig = CliConfig.fromProject().config;
    const projectRoot = this.project.root;
    const protractorLauncher = requireProjectModule(projectRoot, 'protractor/built/launcher');

    if (projectConfig.project && projectConfig.project.ejected) {
      throw new SilentError('An ejected project cannot use the build command anymore.');
    }

    return new Promise(function () {
      let promise = Promise.resolve();
      let additionalProtractorConfig: any = {
        elementExplorer: e2eTaskOptions.elementExplorer
      };

      // use serve url as override for protractors baseUrl
      if (e2eTaskOptions.serve && e2eTaskOptions.publicHost) {
        let publicHost = e2eTaskOptions.publicHost;
        if (!/^\w+:\/\//.test(publicHost)) {
          publicHost = `${e2eTaskOptions.ssl ? 'https' : 'http'}://${publicHost}`;
        }
        const clientUrl = url.parse(publicHost);
        e2eTaskOptions.publicHost = clientUrl.host;
        additionalProtractorConfig.baseUrl = url.format(clientUrl);
      } else if (e2eTaskOptions.serve) {
        additionalProtractorConfig.baseUrl = url.format({
          protocol: e2eTaskOptions.ssl ? 'https' : 'http',
          hostname: e2eTaskOptions.host,
          port: e2eTaskOptions.port.toString()
        });
      } else if (e2eTaskOptions.baseHref) {
        additionalProtractorConfig.baseUrl = e2eTaskOptions.baseHref;
      } else if (e2eTaskOptions.port) {
        additionalProtractorConfig.baseUrl = url.format({
          protocol: e2eTaskOptions.ssl ? 'https' : 'http',
          hostname: e2eTaskOptions.host,
          port: e2eTaskOptions.port.toString()
        });
      }

      if (e2eTaskOptions.specs.length !== 0) {
        additionalProtractorConfig['specs'] = e2eTaskOptions.specs;
      }

      if (e2eTaskOptions.webdriverUpdate) {
        // The webdriver-manager update command can only be accessed via a deep import.
        const webdriverDeepImport = 'webdriver-manager/built/lib/cmds/update';
        let webdriverUpdate: any;

        try {
          // When using npm, webdriver is within protractor/node_modules.
          webdriverUpdate = requireProjectModule(projectRoot,
            `protractor/node_modules/${webdriverDeepImport}`);
        } catch (e) {
          try {
            // When using yarn, webdriver is found as a root module.
            webdriverUpdate = requireProjectModule(projectRoot, webdriverDeepImport);
          } catch (e) {
            throw new SilentError(stripIndents`
              Cannot automatically find webdriver-manager to update.
              Update webdriver-manager manually and run 'ng e2e --no-webdriver-update' instead.
            `);
          }
        }
        // run `webdriver-manager update --standalone false --gecko false --quiet`
        // if you change this, update the command comment in prev line, and in `eject` task
        promise = promise.then(() => webdriverUpdate.program.run({
          standalone: false,
          gecko: false,
          quiet: true
        }));
      }

      // Don't call resolve(), protractor will manage exiting the process itself
      return promise.then(() =>
        protractorLauncher.init(e2eTaskOptions.config, additionalProtractorConfig));
    });
  }
});
