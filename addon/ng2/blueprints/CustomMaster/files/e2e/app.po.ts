export class <%= jsComponentName %>Page {
  navigateTo() {
    return browser.get('/');
  }

  getParagraphText() {
    return element(by.css('<%= htmlComponentName %>-app h1')).getText();
  }
}
