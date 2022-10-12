/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import assert from 'assert';
import * as fs from 'fs';
import { glob as globCb } from 'glob';
import * as path from 'path';
import { promisify } from 'util';
import { packages } from '../lib/packages';
import {
  EventCustomDimension,
  EventCustomMetric,
  UserCustomDimension,
} from '../packages/angular/cli/src/analytics/analytics-parameters';

const userAnalyticsTable = require('./templates/user-analytics-table').default;

const dimensionsTableRe = /<!--DIMENSIONS_TABLE_BEGIN-->([\s\S]*)<!--DIMENSIONS_TABLE_END-->/m;
const userDimensionsTableRe =
  /<!--USER_DIMENSIONS_TABLE_BEGIN-->([\s\S]*)<!--USER_DIMENSIONS_TABLE_END-->/m;
const metricsTableRe = /<!--METRICS_TABLE_BEGIN-->([\s\S]*)<!--METRICS_TABLE_END-->/m;

async function _checkUserDimensions(dimensionsTable: string, logger: logging.Logger) {
  logger.info('Gathering user dimensions from @angular/cli...');
  const data = Object.entries(UserCustomDimension).map(([key, value]) => ({
    parameter: value,
    name: key,
    type: value.charAt(2) === 'n' ? 'number' : 'string',
  }));

  if (data.length > 25) {
    throw new Error(
      'GA has a limit of 25 custom user dimensions. Delete and archive the ones that are not needed.',
    );
  }

  for (const { parameter } of data) {
    const param = parameter.split('.')[1];
    if (param.length > 24) {
      throw new Error(`User dimension parameter ${param} is more than 24 characters.`);
    }
  }

  const generatedTable = userAnalyticsTable({ data }).trim();
  if (dimensionsTable !== generatedTable) {
    logger.error(
      'Expected user dimensions table to be the same as generated. Copy the lines below:',
    );
    logger.error(generatedTable);

    return 3;
  }

  return 0;
}

async function _checkDimensions(dimensionsTable: string, logger: logging.Logger) {
  logger.info('Gathering event dimensions from @angular/cli...');
  const eventCustomDimensionValues = new Set(Object.values(EventCustomDimension));

  logger.info('Gathering options for user-analytics...');
  const schemaUserAnalyticsValidator = (obj: Object) => {
    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') {
        const userAnalytics = value['x-user-analytics'];
        if (userAnalytics && !eventCustomDimensionValues.has(userAnalytics)) {
          throw new Error(
            `Invalid value found in enum AnalyticsDimensions: ${JSON.stringify(userAnalytics)}`,
          );
        } else {
          schemaUserAnalyticsValidator(value);
        }
      }
    }
  };

  const glob = promisify(globCb);
  // Find all the schemas
  const packagesPaths = Object.values(packages).map(({ root }) => root);
  for (const packagePath of packagesPaths) {
    const schemasPaths = await glob('**/schema.json', { cwd: packagePath });

    for (const schemaPath of schemasPaths) {
      const schema = await fs.promises.readFile(path.join(packagePath, schemaPath), 'utf8');
      schemaUserAnalyticsValidator(JSON.parse(schema));
    }
  }

  const data = Object.entries(EventCustomDimension).map(([key, value]) => ({
    parameter: value,
    name: key,
    type: value.charAt(2) === 'n' ? 'number' : 'string',
  }));

  if (data.length > 50) {
    throw new Error(
      'GA has a limit of 50 custom event dimensions. Delete and archive the ones that are not needed.',
    );
  }

  for (const { parameter } of data) {
    const param = parameter.split('.')[1];
    if (param.length > 40) {
      throw new Error(`Event dimension parameter ${param} is more than 40 characters.`);
    }
  }

  const generatedTable = userAnalyticsTable({ data }).trim();
  if (dimensionsTable !== generatedTable) {
    logger.error(
      'Expected event dimensions table to be the same as generated. Copy the lines below:',
    );
    logger.error(generatedTable);

    return 3;
  }

  return 0;
}

async function _checkMetrics(metricsTable: string, logger: logging.Logger) {
  logger.info('Gathering metrics from @angular/cli...');
  const data = Object.entries(EventCustomMetric).map(([key, value]) => ({
    parameter: value,
    name: key,
    type: value.charAt(2) === 'n' ? 'number' : 'string',
  }));

  if (data.length > 50) {
    throw new Error(
      'GA has a limit of 50 custom metrics. Delete and archive the ones that are not needed.',
    );
  }

  for (const { parameter } of data) {
    const param = parameter.split('.')[1];
    if (param.length > 40) {
      throw new Error(`Event metric parameter ${param} is more than 40 characters.`);
    }
  }

  const generatedTable = userAnalyticsTable({ data }).trim();
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
  const userDimensionsMatch = analyticsMarkdown.match(userDimensionsTableRe);
  const metricsMatch = analyticsMarkdown.match(metricsTableRe);

  assert.ok(dimensionsMatch, 'Event dimensions table not found in analytics.md');
  assert.ok(userDimensionsMatch, 'User dimensions table not found in analytics.md');
  assert.ok(metricsMatch, 'Metrics table not found in analytics.md');

  const userDimensionsTable = userDimensionsMatch[1].trim();
  let maybeError = await _checkUserDimensions(userDimensionsTable, logger);
  if (maybeError) {
    return maybeError;
  }

  const metricsTable = metricsMatch[1].trim();
  maybeError = await _checkMetrics(metricsTable, logger);
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
