import { AppPage } from './app.po';

describe('workspace-project App', () => {
  let page: AppPage;

  beforeEach(() => {
    page = new AppPage();
  });

  it('should have prerendered /pokemon/pikachu', async () => {
    page.navigateTo('pokemon/pikachu/index.html');
    expect(await page.isPrerendered());
  });

  // Note: We use '../index.html' because in order to serve
  // static content we must match '*.*' - See server.ts line 28.
  it('should have prerendered /../index.html', async () => {
    page.navigateTo('../index.html');
    expect(await page.isPrerendered());
  });

  // This also verifies that we are using index.original.html to
  // render pages (instead of index.html)
  it('should not have prerendered anything else', async () => {
    page.navigateTo('pokemon/charmander/index.html');
    expect(await page.isPrerendered()).toBe(false);
  });
});
