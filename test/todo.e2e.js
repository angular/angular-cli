describe('Todo', function() {
  var subject;
  var result;

  beforeEach(function() {
    browser.get('/examples/todo');
  });

  it('should have a title', function() {
    subject = browser.getTitle();
    result  = 'Todo Angular 2';

    expect(subject).toEqual(result);
  });

  it('should verify if the main web elements are present in the page', function() {
    subject = element(by.id('todoapp'));
    result  = true;

    expect(subject).toBe(result);
  });


  it('should be able to add items in the to do list', function() {
    subject = element(by.css('.view label'));
    result  = 'Universal JavaScript';

    expect(subject).toEqual(result);
  });

  it('should be able to clean the to do list', function() {
    subject = element(by.id('toggle-all'));
    subject.click();
    // clearCompletedButton.click();
    // expect(viewDiv.isPresent()).toBe(false);

  });


});
