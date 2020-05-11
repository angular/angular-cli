import { browser } from 'protractor';

export class AppPage {
  navigateTo(route: string) {
    return browser.get(browser.baseUrl + route);
  }

  async isPrerendered() {
    // Prerendered pages have a comment added to the bottom.
    const node = await browser.executeScript('return document.lastChild') as HTMLElement;
    const expectedValue = ' This page was prerendered with Angular Universal ';
    const expectedName = '#comment';
    return node.nodeValue === expectedValue && node.nodeName === expectedName;
  }
}
