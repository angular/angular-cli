import { browser, logging, element, by } from 'protractor';

describe('workspace-project App', () => {
  it('should display lazy route', () => {
    browser.get(browser.baseUrl + '/lazy');
    expect(element(by.css('app-lazy-comp p')).getText()).toEqual('lazy-comp works!');
  });

  afterEach(async () => {
    // Assert that there are no errors emitted from the browser
    const logs = await browser.manage().logs().get(logging.Type.BROWSER);
    expect(logs).not.toContain(jasmine.objectContaining({
      level: logging.Level.SEVERE,
    }));
  });
});
