import { browser, by, element } from 'protractor';

export class AppPage {
  navigateTo() {
    return browser.get('/') as Promise<any>;
  }

  getTitleText() {
    return element(by.css('<%= rootSelector %> h1')).getText() as Promise<string>;
  }
}
