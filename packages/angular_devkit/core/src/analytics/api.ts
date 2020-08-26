/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface CustomDimensionsAndMetricsOptions {
  dimensions?: (boolean | number | string)[];
  metrics?: (boolean | number | string)[];
}

export interface EventOptions extends CustomDimensionsAndMetricsOptions {
  label?: string;
  value?: string;
}

export interface ScreenviewOptions extends CustomDimensionsAndMetricsOptions {
  appVersion?: string;
  appId?: string;
  appInstallerId?: string;
}

export interface PageviewOptions extends CustomDimensionsAndMetricsOptions {
  hostname?: string;
  title?: string;
}

export interface TimingOptions extends CustomDimensionsAndMetricsOptions {
  label?: string;
}

/**
 * Interface for managing analytics. This is highly platform dependent, and mostly matches
 * Google Analytics. The reason the interface is here is to remove the dependency to an
 * implementation from most other places.
 *
 * The methods exported from this interface more or less match those needed by us in the
 * universal analytics package, see https://unpkg.com/@types/universal-analytics@0.4.2/index.d.ts
 * for typings. We mostly named arguments to make it easier to follow, but didn't change or
 * add any semantics to those methods. They're mapping GA and u-a one for one.
 *
 * The Angular CLI (or any other kind of backend) should forward it to some compatible backend.
 */
export interface Analytics {
  event(category: string, action: string, options?: EventOptions): void;
  screenview(screenName: string, appName: string, options?: ScreenviewOptions): void;
  pageview(path: string, options?: PageviewOptions): void;
  timing(category: string, variable: string, time: string | number, options?: TimingOptions): void;

  flush(): Promise<void>;
}
