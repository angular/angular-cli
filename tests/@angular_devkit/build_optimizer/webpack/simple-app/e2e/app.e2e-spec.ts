import { browser, element, by } from 'protractor';

describe('Webpack simple app', function () {

  beforeEach(() => browser.get(''));

  afterEach(() => {
    browser.manage().logs().get('browser').then((browserLog: any[]) => {
      expect(browserLog).toEqual([]);
    });
  });

  it('should display hello world', () => {
    expect(element(by.css('h1')).getText()).toEqual('hello world');
  });

  it('should route to home by default', () => {
    expect(element(by.css('h2')).getText()).toEqual('home!');
  });

  it('should route to lazy', () => {
    element.all(by.css('app-root a')).get(1).click();
    expect(element(by.css('h2')).getText()).toEqual('lazy!');
  });

  it('should route to lazy-feature', () => {
    element.all(by.css('app-root a')).get(2).click();
    expect(element(by.css('h2')).getText()).toEqual('lazy/feature!');
  });

});
