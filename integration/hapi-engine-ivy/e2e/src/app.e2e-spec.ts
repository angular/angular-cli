/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {browser, by, element} from 'protractor';

import {verifyNoBrowserErrors, waitForAppRootElement} from './util';

describe('Hello world E2E Tests', () => {
  beforeAll(async () => {
    await browser.driver.wait(
      waitForAppRootElement(),
      6000 * 2,
      'Server should have started in 2 minutes',
    );
  });

  it('should display: Hello world!', async () => {
    // Load the page without waiting for Angular since it is not bootstrapped automatically.
    await browser.driver.get(browser.baseUrl);

    const style = browser.driver.findElement(by.css('style[ng-transition="hlw"]'));
    expect(style.getText()).not.toBeNull();

    // Test the contents from the server.
    const serverDiv = browser.driver.findElement(by.css('div'));
    expect(serverDiv.getText()).toMatch('Hello world!');

    // Bootstrap the client side app.
    await browser.executeScript('doBootstrap()');

    // Retest the contents after the client bootstraps.
    expect(element(by.css('div')).getText()).toMatch('Hello world!');

    // Make sure the server styles got replaced by client side ones.
    expect(element(by.css('style[ng-transition="hlw"]')).isPresent()).toBeFalsy();
    expect(element(by.css('style')).getText()).toMatch('');

    // Make sure there were no client side errors.
    verifyNoBrowserErrors();
  });

  it('should populate window.location', async () => {
    // Load the page without waiting for Angular since it is not bootstrapped automatically.
    await browser.driver.get(browser.baseUrl);

    // Test the contents from the server.
    const serverDiv = browser.driver.findElement(by.css('span.href-check'));
    expect(serverDiv.getText()).toMatch('//localhost:4200');

    // Make sure there were no client side errors.
    verifyNoBrowserErrors();
   });
});
