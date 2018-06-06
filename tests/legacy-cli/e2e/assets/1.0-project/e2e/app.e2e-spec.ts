import { OneOhProjectPage } from './app.po';

describe('one-oh-project App', () => {
  let page: OneOhProjectPage;

  beforeEach(() => {
    page = new OneOhProjectPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
