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
 */
export enum NgCliAnalyticsDimensions {
  NgAddCollection = 6,
  NgBuildBuildEventLog = 7,
  BuildErrors = 20,
}

export enum NgCliAnalyticsMetrics {
  CpuCount = 1,
  CpuSpeed = 2,
  RamInMegabytes = 3,
  NodeVersion = 4,
  BuildTime = 5,
  NgOnInitCount = 6,
  InitialChunkSize = 7,
  TotalChunkCount = 8,
  TotalChunkSize = 9,
  LazyChunkCount = 10,
  LazyChunkSize = 11,
  AssetCount = 12,
  AssetSize = 13,
  PolyfillSize = 12,
  CssSize = 13,
}
