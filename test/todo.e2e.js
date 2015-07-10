describe('Todo', function() {
  it('should have a title', function() {
    browser.ignoreSynchronization = true;
    browser.get('/examples/todo');
    expect(browser.getTitle()).toEqual('Todo Angular 2');
  });

  it('should verify if the main web elements are present in the page', function() {
    var todoapp = element($('#todoapp').locator());
    expect(todoapp.isPresent()).toBe(true);
  });

  it('should be able to add items in the to do list', function() {
    var todoLabel = element(by.css('.view label'));
    expect(todoLabel.getText()).toEqual('Universal JavaScript');
  });

  it('should be able to clean the to do list', function() {
    var toogleAllCheckBox = element($('#toggle-all').locator());
    // var clearCompletedButton = element(by.css('#clear-completed'));
    // var viewDiv = element(by.css('.view label'));

    toogleAllCheckBox.click();
    // clearCompletedButton.click();
    // expect(viewDiv.isPresent()).toBe(false);

  });


});
