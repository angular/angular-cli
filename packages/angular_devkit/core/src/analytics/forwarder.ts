/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject } from '../json';
import { Analytics, EventOptions, PageviewOptions, ScreenviewOptions, TimingOptions } from './api';


export enum AnalyticsReportKind {
  Event = 'event',
  Screenview = 'screenview',
  Pageview = 'pageview',
  Timing = 'timing',
}

export interface AnalyticsReportBase extends JsonObject {
  kind: AnalyticsReportKind;
}

export interface AnalyticsReportEvent extends AnalyticsReportBase {
  kind: AnalyticsReportKind.Event;
  options: JsonObject & EventOptions;
  category: string;
  action: string;
}
export interface AnalyticsReportScreenview extends AnalyticsReportBase {
  kind: AnalyticsReportKind.Screenview;
  options: JsonObject & ScreenviewOptions;
  screenName: string;
  appName: string;
}
export interface AnalyticsReportPageview extends AnalyticsReportBase {
  kind: AnalyticsReportKind.Pageview;
  options: JsonObject & PageviewOptions;
  path: string;
}
export interface AnalyticsReportTiming extends AnalyticsReportBase {
  kind: AnalyticsReportKind.Timing;
  options: JsonObject & TimingOptions;
  category: string;
  variable: string;
  time: string | number;
}

export type AnalyticsReport =
  AnalyticsReportEvent
  | AnalyticsReportScreenview
  | AnalyticsReportPageview
  | AnalyticsReportTiming
  ;

/**
 * A function that can forward analytics along some stream. AnalyticsReport is already a
 * JsonObject descendant, but we force it here so the user knows it's safe to serialize.
 */
export type AnalyticsForwarderFn = (report: JsonObject & AnalyticsReport) => void;

/**
 * A class that follows the Analytics interface and forwards analytic reports (JavaScript objects).
 * AnalyticsReporter is the counterpart which takes analytic reports and report them to another
 * Analytics interface.
 */
export class ForwardingAnalytics implements Analytics {
  constructor(protected _fn: AnalyticsForwarderFn) {}

  event(category: string, action: string, options?: EventOptions) {
    this._fn({
      kind: AnalyticsReportKind.Event,
      category,
      action,
      options: { ...options } as JsonObject,
    });
  }
  screenview(screenName: string, appName: string, options?: ScreenviewOptions) {
    this._fn({
      kind: AnalyticsReportKind.Screenview,
      screenName,
      appName,
      options: { ...options } as JsonObject,
    });
  }
  pageview(path: string, options?: PageviewOptions) {
    this._fn({
      kind: AnalyticsReportKind.Pageview,
      path,
      options: { ...options } as JsonObject,
    });
  }
  timing(category: string, variable: string, time: string | number, options?: TimingOptions): void {
    this._fn({
      kind: AnalyticsReportKind.Timing,
      category,
      variable,
      time,
      options: { ...options } as JsonObject,
    });
  }

  // We do not support flushing.
  flush() {
    return Promise.resolve();
  }
}


export class AnalyticsReporter {
  constructor(protected _analytics: Analytics) {}

  report(report: AnalyticsReport) {
    switch (report.kind) {
      case AnalyticsReportKind.Event:
        this._analytics.event(report.category, report.action, report.options);
        break;
      case AnalyticsReportKind.Screenview:
        this._analytics.screenview(report.screenName, report.appName, report.options);
        break;
      case AnalyticsReportKind.Pageview:
        this._analytics.pageview(report.path, report.options);
        break;
      case AnalyticsReportKind.Timing:
        this._analytics.timing(report.category, report.variable, report.time, report.options);
        break;

      default:
        throw new Error('Unexpected analytics report: ' + JSON.stringify(report));
    }
  }
}
