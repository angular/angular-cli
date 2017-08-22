import * as fs from 'fs-extra';
import * as path from 'path';
import * as webpack from 'webpack';
import { red, yellow } from 'chalk';

import { getAppFromConfig } from '../utilities/app-utils';
import { BuildTaskOptions } from '../commands/build';
import { NgCliWebpackConfig } from '../models/webpack-config';
import { getWebpackStatsConfig } from '../models/webpack-configs/utils';
import { CliConfig } from '../models/config';
import {
  statsToString,
  statsWarningsToString,
  statsErrorsToString,
  evaluateBudgets,
  BudgetResult
} from '../utilities/stats';

const Task = require('../ember-cli/lib/models/task');
const SilentError = require('silent-error');


export default Task.extend({
  run: function (runTaskOptions: BuildTaskOptions) {
    const config = CliConfig.fromProject().config;

    const appConfig = getAppFromConfig(runTaskOptions.app);

    const outputPath = runTaskOptions.outputPath || appConfig.outDir;
    if (this.project.root === path.resolve(outputPath)) {
      throw new SilentError('Output path MUST not be project root directory!');
    }
    if (config.project && config.project.ejected) {
      throw new SilentError('An ejected project cannot use the build command anymore.');
    }
    if (runTaskOptions.deleteOutputPath) {
      fs.removeSync(path.resolve(this.project.root, outputPath));
    }

    const webpackConfig = new NgCliWebpackConfig(runTaskOptions, appConfig).buildConfig();
    const webpackCompiler = webpack(webpackConfig);
    const statsConfig = getWebpackStatsConfig(runTaskOptions.verbose);

    return new Promise((resolve, reject) => {
      const callback: webpack.compiler.CompilerCallback = (err, stats) => {
        if (err) {
          return reject(err);
        }

        const json = stats.toJson('verbose');

        let budgetResults: BudgetResult[];
        if (runTaskOptions.target === 'production' && !!appConfig.budgets) {
          budgetResults = evaluateBudgets(json, appConfig.budgets);
        }

        if (runTaskOptions.verbose) {
          this.ui.writeLine(stats.toString(statsConfig));
        } else {
          const bundleBudgetResults = budgetResults.filter(br => br.type === 'bundle');
          this.ui.writeLine(statsToString(json, statsConfig, bundleBudgetResults));
        }


        const initialBudgetResults = budgetResults.filter(br => br.type === 'initial');
        if (initialBudgetResults.length > 0) {
          const prefix = initialBudgetResults.every(b => b.result === 'Warning')
            ? 'Warning' : 'Error';
          const color = prefix === 'Warning' ? yellow : red;
          this.ui.writeLine(color(`${prefix}: Initial budget size exceeded.`));
        }

        if (budgetResults.filter(br => br.result === 'Error').length > 0) {
          reject('Bundle budget exceeded');
        }

        if (stats.hasWarnings()) {
          this.ui.writeLine(statsWarningsToString(json, statsConfig));
        }
        if (stats.hasErrors()) {
          this.ui.writeError(statsErrorsToString(json, statsConfig));
        }

        if (runTaskOptions.watch) {
          return;
        } else if (runTaskOptions.statsJson) {
          fs.writeFileSync(
            path.resolve(this.project.root, outputPath, 'stats.json'),
            JSON.stringify(stats.toJson(), null, 2)
          );
        }

        if (stats.hasErrors()) {
          reject();
        } else {
          resolve();
        }
      };

      if (runTaskOptions.watch) {
        webpackCompiler.watch({ poll: runTaskOptions.poll }, callback);
      } else {
        webpackCompiler.run(callback);
      }
    })
    .catch((err: Error) => {
      if (err) {
        this.ui.writeError('\nAn error occured during the build:\n' + ((err && err.stack) || err));
      }
      throw err;
    });
  }
});
