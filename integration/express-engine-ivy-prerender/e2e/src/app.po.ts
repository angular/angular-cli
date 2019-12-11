import { browser, by, element, logging } from 'protractor';

export class AppPage {
  navigateTo(route: string) {
    browser.get(browser.baseUrl + route);
  }

  getTitleText() {
    return element(by.tagName('h1')).getText() as Promise<string>;
  }

  async is404(route: string) {
    // Need this to avoid getting an "Angular could not be found on the page" error
    browser.waitForAngularEnabled(false);
    browser.get(`/${route}`);
    browser.waitForAngularEnabled(true);

    const logs = await browser.manage().logs().get(logging.Type.BROWSER);
    if (!logs.length) {
      return false;
    }

    const lastError = logs[logs.length - 1];
    const errmsg = `http://localhost:3000/${route} - Failed to load resource: the server responded with a status of 404 (Not Found)`

    return lastError.message === errmsg;
  }
}
