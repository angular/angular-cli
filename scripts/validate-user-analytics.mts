/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import glob from 'fast-glob';
import lodash from 'lodash';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EventCustomDimension,
  EventCustomMetric,
  UserCustomDimension,
} from '../packages/angular/cli/src/analytics/analytics-parameters.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userAnalyticsTable = lodash.template(
  fs.readFileSync(path.join(__dirname, './templates/user-analytics-table.ejs'), 'utf-8'),
);

const dimensionsTableRe = /<!--DIMENSIONS_TABLE_BEGIN-->([\s\S]*)<!--DIMENSIONS_TABLE_END-->/m;
const userDimensionsTableRe =
  /<!--USER_DIMENSIONS_TABLE_BEGIN-->([\s\S]*)<!--USER_DIMENSIONS_TABLE_END-->/m;
const metricsTableRe = /<!--METRICS_TABLE_BEGIN-->([\s\S]*)<!--METRICS_TABLE_END-->/m;

async function _checkUserDimensions(dimensionsTable: string) {
  console.info('Gathering user dimensions from @angular/cli...');
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
    console.error(
      'Expected user dimensions table to be the same as generated. Copy the lines below:',
    );
    console.error(generatedTable);

    return 3;
  }

  return 0;
}

async function _checkDimensions(dimensionsTable: string) {
  console.info('Gathering event dimensions from @angular/cli...');
  const eventCustomDimensionValues = new Set(Object.values(EventCustomDimension));

  console.info('Gathering options for user-analytics...');
  const schemaUserAnalyticsValidator = (obj: object) => {
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

  // Find all the schemas
  const { packages } = await import('./packages.mjs');
  const packagesPaths = packages.map(({ root }) => root);
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
    console.error(
      'Expected event dimensions table to be the same as generated. Copy the lines below:',
    );
    console.error(generatedTable);

    return 3;
  }

  return 0;
}

async function _checkMetrics(metricsTable: string) {
  console.info('Gathering metrics from @angular/cli...');
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
    console.error('Expected metrics table to be the same as generated. Copy the lines below:');
    console.error(generatedTable);

    return 4;
  }

  return 0;
}

/**
 * Validate that the table of analytics from the analytics.md document is the same as expected /
 * generated.
 */
export default async function (_options: {}): Promise<number> {
  const analyticsMarkdownPath = path.join(__dirname, '../docs/design/analytics.md');
  const analyticsMarkdown = fs.readFileSync(analyticsMarkdownPath, 'utf8');
  const dimensionsMatch = analyticsMarkdown.match(dimensionsTableRe);
  const userDimensionsMatch = analyticsMarkdown.match(userDimensionsTableRe);
  const metricsMatch = analyticsMarkdown.match(metricsTableRe);

  assert.ok(dimensionsMatch, 'Event dimensions table not found in analytics.md');
  assert.ok(userDimensionsMatch, 'User dimensions table not found in analytics.md');
  assert.ok(metricsMatch, 'Metrics table not found in analytics.md');

  const userDimensionsTable = userDimensionsMatch[1].trim();
  let maybeError = await _checkUserDimensions(userDimensionsTable);
  if (maybeError) {
    return maybeError;
  }

  const metricsTable = metricsMatch[1].trim();
  maybeError = await _checkMetrics(metricsTable);
  if (maybeError) {
    return maybeError;
  }

  const dimensionsTable = dimensionsMatch[1].trim();
  maybeError = await _checkDimensions(dimensionsTable);
  if (maybeError) {
    return maybeError;
  }

  return 0;
}
