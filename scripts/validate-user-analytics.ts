/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { analytics, logging, tags } from '@angular-devkit/core';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CommandDescriptionMap, Option } from '../packages/angular/cli/models/interface';
import create from './create';

const userAnalyticsTable = require('./templates/user-analytics-table').default;

const dimensionsTableRe = /<!--DIMENSIONS_TABLE_BEGIN-->([\s\S]*)<!--DIMENSIONS_TABLE_END-->/m;
const metricsTableRe = /<!--METRICS_TABLE_BEGIN-->([\s\S]*)<!--METRICS_TABLE_END-->/m;

/**
 * Execute a command.
 * @private
 */
function _exec(command: string, args: string[], opts: { cwd?: string }, logger: logging.Logger) {
  const { status, error, stdout } = spawnSync(command, args, {
    stdio: ['ignore', 'pipe', 'inherit'],
    ...opts,
  });

  if (status != 0) {
    logger.error(`Command failed: ${command} ${args.map(x => JSON.stringify(x)).join(', ')}`);
    throw error;
  }

  return stdout.toString('utf-8');
}

async function _checkDimensions(dimensionsTable: string, logger: logging.Logger) {
  const data: { userAnalytics: number, type: string, name: string }[] = new Array(200);

  function _updateData(userAnalytics: number, name: string, type: string) {
    if (data[userAnalytics]) {
      if (data[userAnalytics].name !== name) {
        logger.error(tags.stripIndents`
            User analytics clash with the same name: ${data[userAnalytics].name} and
            ${name} both have userAnalytics of ${userAnalytics}
          `);

        return 2;
      }
    } else {
      data[userAnalytics] = { userAnalytics, name, type };
    }
  }

  logger.info('Gathering fixed dimension from @angular-devkit/core...');

  // Create the data with dimensions missing from schema.json:
  const allFixedDimensions = Object.keys(analytics.NgCliAnalyticsDimensions)
  // tslint:disable-next-line:no-any
    .filter(x => typeof analytics.NgCliAnalyticsDimensions[x as any] === 'number');

  for (const name of allFixedDimensions) {
    // tslint:disable-next-line:no-any
    const userAnalytics = analytics.NgCliAnalyticsDimensions[name as any];
    if (!(name in analytics.NgCliAnalyticsDimensionsFlagInfo)) {
      throw new Error(
        `Flag ${name} is in NgCliAnalyticsDimensions but not NgCliAnalyticsDimensionsFlagInfo`,
      );
    }

    const [flagName, type] = analytics.NgCliAnalyticsDimensionsFlagInfo[name];
    if (typeof userAnalytics !== 'number') {
      throw new Error(
        `Invalid value found in enum AnalyticsDimensions: ${JSON.stringify(userAnalytics)}`,
      );
    }
    _updateData(userAnalytics, flagName, type);
  }


  // Creating a new project and reading the help.
  logger.info('Creating temporary project for gathering help...');

  const newProjectTempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'angular-cli-create-'));
  const newProjectName = 'help-project';
  const newProjectRoot = path.join(newProjectTempRoot, newProjectName);
  await create({ _: [newProjectName] }, logger.createChild('create'), newProjectTempRoot);

  const commandDescription: CommandDescriptionMap = {};

  logger.info('Gathering options...');

  const commands = require('../packages/angular/cli/commands.json');
  const ngPath = path.join(newProjectRoot, 'node_modules/.bin/ng');
  for (const commandName of Object.keys(commands)) {
    const options = { cwd: newProjectRoot };
    const childLogger = logger.createChild(commandName);
    const stdout = _exec(ngPath, [commandName, '--help=json'], options, childLogger);
    commandDescription[commandName] = JSON.parse(stdout.trim());
  }

  function _checkOptionsForAnalytics(options: Option[]) {
    for (const option of options) {
      if (option.subcommands) {
        for (const subcommand of Object.values(option.subcommands)) {
          _checkOptionsForAnalytics(subcommand.options);
        }
      }

      if (option.userAnalytics === undefined) {
        continue;
      }
      _updateData(option.userAnalytics, 'Flag: --' + option.name, option.type);
    }
  }

  for (const commandName of Object.keys(commandDescription)) {
    _checkOptionsForAnalytics(commandDescription[commandName].options);
  }

  const generatedTable = userAnalyticsTable({ flags: data }).trim();
  if (dimensionsTable !== generatedTable) {
    logger.error('Expected dimensions table to be the same as generated. Copy the lines below:');
    logger.error(generatedTable);

    return 3;
  }

  return 0;
}

async function _checkMetrics(metricsTable: string, logger: logging.Logger) {
  const data: { userAnalytics: number, type: string, name: string }[] = new Array(200);

  function _updateData(userAnalytics: number, name: string, type: string) {
    if (data[userAnalytics]) {
      if (data[userAnalytics].name !== name) {
        logger.error(tags.stripIndents`
            User analytics clash with the same name: ${data[userAnalytics].name} and
            ${name} both have userAnalytics of ${userAnalytics}
          `);

        return 2;
      }
    } else {
      data[userAnalytics] = { userAnalytics, name, type };
    }
  }

  logger.info('Gathering fixed metrics from @angular-devkit/core...');

  // Create the data with dimensions missing from schema.json:
  const allFixedMetrics = Object.keys(analytics.NgCliAnalyticsMetrics)
  // tslint:disable-next-line:no-any
    .filter(x => typeof analytics.NgCliAnalyticsMetrics[x as any] === 'number');

  for (const name of allFixedMetrics) {
    // tslint:disable-next-line:no-any
    const userAnalytics = analytics.NgCliAnalyticsMetrics[name as any];
    if (!(name in analytics.NgCliAnalyticsMetricsFlagInfo)) {
      throw new Error(
        `Flag ${name} is in NgCliAnalyticsMetrics but not NgCliAnalyticsMetricsFlagInfo`,
      );
    }

    const [flagName, type] = analytics.NgCliAnalyticsMetricsFlagInfo[name];
    if (typeof userAnalytics !== 'number') {
      throw new Error(
        `Invalid value found in enum NgCliAnalyticsMetrics: ${JSON.stringify(userAnalytics)}`,
      );
    }
    _updateData(userAnalytics, flagName, type);
  }

  const generatedTable = userAnalyticsTable({ flags: data }).trim();
  if (metricsTable !== generatedTable) {
    logger.error('Expected metrics table to be the same as generated. Copy the lines below:');
    logger.error(generatedTable);

    return 4;
  }

  return 0;
}

/**
 * Validate that the table of analytics from the analytics.md document is the same as expected /
 * generated.
 */
export default async function (_options: {}, logger: logging.Logger): Promise<number> {
  const analyticsMarkdownPath = path.join(__dirname, '../docs/design/analytics.md');
  const analyticsMarkdown = fs.readFileSync(analyticsMarkdownPath, 'utf8');
  const dimensionsMatch = analyticsMarkdown.match(dimensionsTableRe);
  const metricsMatch = analyticsMarkdown.match(metricsTableRe);

  if (!dimensionsMatch || !metricsMatch) {
    logger.fatal('Could not find dimensions or metrics table in analytics.md');

    return 1;
  }

  const metricsTable = metricsMatch[1].trim();
  let maybeError = await _checkMetrics(metricsTable, logger);
  if (maybeError) {
    return maybeError;
  }

  const dimensionsTable = dimensionsMatch[1].trim();
  maybeError = await _checkDimensions(dimensionsTable, logger);
  if (maybeError) {
    return maybeError;
  }

  return 0;
}
