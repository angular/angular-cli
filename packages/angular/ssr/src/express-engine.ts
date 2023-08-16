/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { CommonEngine, CommonEngineRenderOptions } from './common-engine';

/**
 * Allowed options for the express engine
 */
export interface NgExpressEngineOptions
  extends Pick<CommonEngineRenderOptions, 'providers' | 'publicPath' | 'inlineCriticalCss'> {
  bootstrap: NonNullable<CommonEngineRenderOptions['bootstrap']>;
}

export type NgExpressEngineRenderOptions = CommonEngineRenderOptions;

/**
 * Express engine for handling Angular Applications
 */
export function ngExpressEngine(setupOptions: Readonly<NgExpressEngineOptions>) {
  const engine = new CommonEngine(setupOptions.bootstrap, setupOptions.providers);

  return (
    path: string,
    options: NgExpressEngineRenderOptions,
    callback: (err?: Error | null, html?: string) => void,
  ) => {
    const renderOptions = { ...options };
    if (!setupOptions.bootstrap && !renderOptions.bootstrap) {
      throw new Error('You must pass in a NgModule to be bootstrapped.');
    }

    renderOptions.documentFilePath ??= path;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderOptions.publicPath ??= setupOptions.publicPath ?? (options as any).settings?.views;
    renderOptions.inlineCriticalCss ??= setupOptions.inlineCriticalCss;

    engine
      .render(renderOptions)
      .then((html) => callback(null, html))
      .catch(callback);
  };
}
