import { OneProjPage } from './app.po';

describe('one-point-oh-project App', () => {
  let page: OneProjPage;

  beforeEach(() => {
    page = new OneProjPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
