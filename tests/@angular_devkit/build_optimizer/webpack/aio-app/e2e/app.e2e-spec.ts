/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { browser, element, by } from 'protractor';

describe('Webpack AIO app', function () {

  beforeEach(() => browser.get(''));

  afterEach(() => {
    browser.manage().logs().get('browser').then((browserLog: any[]) => {
      expect(browserLog).toEqual([]);
    });
  });

  it('should display Powered by Google', () => {
    expect(element(by.css('aio-footer')).getText()).toContain('Powered by Google');
  });

});
