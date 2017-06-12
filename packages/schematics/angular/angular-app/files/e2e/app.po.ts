import { browser, element, by } from 'protractor';

export class <%= utils.classify(name) %>Page {
  navigateTo() {
    return browser.get('/');
  }

  getParagraphText() {
    return element(by.css('<%= prefix %>-root h1')).getText();
  }
}
