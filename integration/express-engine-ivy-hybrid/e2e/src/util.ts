/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { browser, by } from 'protractor';

export async function waitForAppRootElement(): Promise<boolean> {
  try {
    await browser.driver.get(browser.baseUrl);
    await browser.driver.findElement(by.tagName('app-root'));
    return true;
  } catch {
    await browser.driver.sleep(1000);
    return waitForAppRootElement();
  }
}

export async function isPrerendered(): Promise<boolean> {
  const src = await browser.driver.getPageSource();
  return src.includes('This page was prerendered with Angular Universal');
}
