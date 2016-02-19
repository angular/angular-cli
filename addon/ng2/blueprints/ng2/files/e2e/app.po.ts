export class <%= jsComponentName %>Page {
  navigateTo() { return browser.get('/'); }
  getParagraphText() { return element(by.css('<%= jsComponentName %>-app p')).getText(); }
}
