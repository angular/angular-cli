/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { analytics, logging, schema, strings, tags } from '@angular-devkit/core';
import * as fs from 'fs';
import { glob as globCb } from 'glob';
import * as path from 'path';
import { promisify } from 'util';
import { packages } from '../lib/packages';

const userAnalyticsTable = require('./templates/user-analytics-table').default;

const dimensionsTableRe = /<!--DIMENSIONS_TABLE_BEGIN-->([\s\S]*)<!--DIMENSIONS_TABLE_END-->/m;
const metricsTableRe = /<!--METRICS_TABLE_BEGIN-->([\s\S]*)<!--METRICS_TABLE_END-->/m;

async function _checkDimensions(dimensionsTable: string, logger: logging.Logger) {
  const data: { userAnalytics: number; type: string; name: string }[] = new Array(200);

  function updateData(userAnalytics: number, name: string, type: string) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((x) => typeof analytics.NgCliAnalyticsDimensions[x as any] === 'number');

  for (const name of allFixedDimensions) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    updateData(userAnalytics, flagName, type);
  }

  logger.info('Gathering options for user-analytics...');

  const userAnalyticsGatherer = (obj: Object) => {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        if ('x-user-analytics' in value) {
          const type =
            [...schema.getTypesOfSchema(value)].find((type) => type !== 'object') ?? 'string';

          updateData(value['x-user-analytics'], 'Flag: --' + strings.dasherize(key), type);
        } else {
          userAnalyticsGatherer(value);
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
      userAnalyticsGatherer(JSON.parse(schema));
    }
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
  const data: { userAnalytics: number; type: string; name: string }[] = new Array(200);

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((x) => typeof analytics.NgCliAnalyticsMetrics[x as any] === 'number');

  for (const name of allFixedMetrics) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
