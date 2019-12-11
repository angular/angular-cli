import { AppPage } from './app.po';

describe('workspace-project App', () => {
  let page: AppPage;

  beforeEach(() => {
    page = new AppPage();
  });

  it('should have prerendered /pikachu', async () => {
    page.navigateTo('pikachu');
    expect(await page.getTitleText()).toEqual('pikachu');
  });

  it('should not have prerendered anything else', async () => {
    // This test is just to verify that we are serving ONLY static content.
    expect(await page.is404('charmander'));
  });
});
