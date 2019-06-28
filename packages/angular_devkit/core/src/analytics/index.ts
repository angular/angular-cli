/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export * from './api';
export * from './forwarder';
export * from './logging';
export * from './multi';
export * from './noop';

/**
 * MAKE SURE TO KEEP THIS IN SYNC WITH THE TABLE AND CONTENT IN `/docs/design/analytics.md`.
 * WE LIST THOSE DIMENSIONS (AND MORE).
 *
 * These cannot be in their respective schema.json file because we either change the type
 * (e.g. --buildEventLog is string, but we want to know the usage of it, not its value), or
 * some validation needs to be done (we cannot record ng add --collection if it's not whitelisted).
 */
export enum NgCliAnalyticsDimensions {
  CpuCount = 1,
  CpuSpeed = 2,
  RamInGigabytes = 3,
  NodeVersion = 4,
  NgAddCollection = 6,
  NgBuildBuildEventLog = 7,
  BuildErrors = 20,
}

export enum NgCliAnalyticsMetrics {
  NgComponentCount = 1,
  UNUSED_2 = 2,
  UNUSED_3 = 3,
  UNUSED_4 = 4,
  BuildTime = 5,
  NgOnInitCount = 6,
  InitialChunkSize = 7,
  TotalChunkCount = 8,
  TotalChunkSize = 9,
  LazyChunkCount = 10,
  LazyChunkSize = 11,
  AssetCount = 12,
  AssetSize = 13,
  PolyfillSize = 14,
  CssSize = 15,
}

// This table is used when generating the analytics.md file. It should match the enum above
// or the validate-user-analytics script will fail.
export const NgCliAnalyticsDimensionsFlagInfo: { [name: string]: [string, string] } = {
  CpuCount: ['CPU Count', 'number'],
  CpuSpeed: ['CPU Speed', 'number'],
  RamInGigabytes: ['RAM (In GB)', 'number'],
  NodeVersion: ['Node Version', 'number'],
  NgAddCollection: ['--collection', 'string'],
  NgBuildBuildEventLog: ['--buildEventLog', 'boolean'],
  BuildErrors: ['Build Errors (comma separated)', 'string'],
};

// This table is used when generating the analytics.md file. It should match the enum above
// or the validate-user-analytics script will fail.
export const NgCliAnalyticsMetricsFlagInfo: { [name: string]: [string, string] } = {
  NgComponentCount: ['NgComponentCount', 'number'],
  UNUSED_2: ['UNUSED_2', 'none'],
  UNUSED_3: ['UNUSED_3', 'none'],
  UNUSED_4: ['UNUSED_4', 'none'],
  BuildTime: ['Build Time', 'number'],
  NgOnInitCount: ['NgOnInit Count', 'number'],
  InitialChunkSize: ['Initial Chunk Size', 'number'],
  TotalChunkCount: ['Total Chunk Count', 'number'],
  TotalChunkSize: ['Total Chunk Size', 'number'],
  LazyChunkCount: ['Lazy Chunk Count', 'number'],
  LazyChunkSize: ['Lazy Chunk Size', 'number'],
  AssetCount: ['Asset Count', 'number'],
  AssetSize: ['Asset Size', 'number'],
  PolyfillSize: [' Polyfill Size', 'number'],
  CssSize: [' Css Size', 'number'],
};
