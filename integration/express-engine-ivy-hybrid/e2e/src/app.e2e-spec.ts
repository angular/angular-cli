import { browser, by, element } from 'protractor';
import { waitForAppRootElement, isPrerendered } from './util';

describe('workspace-project App', () => {
  beforeAll(async () => {
    await browser.waitForAngularEnabled(false);

    await browser.driver.wait(
      waitForAppRootElement(),
      6000 * 2,
      'Server should have started in 2 minutes',
    );
  });

  it('should have prerendered /', async () => {
    // Load the page without waiting for Angular since it is not bootstrapped automatically.
    await browser.driver.get(browser.baseUrl);
    expect(await isPrerendered()).toBe(true);
  });

  it('should have prerendered /pokemon/pikachu', async () => {
    await browser.driver.get(browser.baseUrl + 'pokemon/pikachu');
    expect(element(by.css('h1')).getText()).toMatch('pikachu');
    expect(await isPrerendered()).toBe(true);
  });

  // This also verifies that we are using index.original.html to
  // render pages (instead of index.html)
  it(`should serve SSR'd version of the page when not prerendered.`, async () => {
    await browser.driver.get(browser.baseUrl + 'pokemon/charmander');
    expect(element(by.css('h1')).getText()).toMatch('charmander');
    expect(await isPrerendered()).toBe(false);
  });
});
