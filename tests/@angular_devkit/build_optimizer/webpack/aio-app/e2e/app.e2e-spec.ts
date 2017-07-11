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
