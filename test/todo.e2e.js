var webdriver = require('selenium-webdriver');

describe('Todo', function() {
  var EC = protractor.ExpectedConditions;
  // afterEach(verifyNoBrowserErrors);

  describe('Server only render', function() {
    beforeEach(function() {
      browser.get(appendQuery('/examples/todo', {
        server: true,
        client: false,
        preboot: false,
        bootstrap: false
      }));
    });

    it('should have a title', function() {
      var subject = browser.getTitle();
      var result  = 'Todo Angular 2';

      expect(subject).toEqual(result);
    });

    it('should verify if the main web elements are present in the page', function() {
      var subject = element(by.css('#todoapp')).isPresent();
      var result  = true;

      expect(subject).toBe(result);
    });

    it('should be able to add items in the to do list', function() {
      var subject = element.all(by.css('.view label')).first().getText();
      var result  = 'Universal JavaScript';

      expect(subject).toEqual(result);
    });
  });

  describe('Client only render', function() {
    beforeEach(function() {
      browser.get(appendQuery('/examples/todo', {
        server: false,
        client: true,
        preboot: false,
        bootstrap: true
      }));
      browser.driver.sleep(500);
    });

    it('should be able to complete a todo in the  list', function() {

      var currentTodo = element.all(by.css('.view input')).first();
      browser.actions().mouseMove(currentTodo).click().perform();

      var subject = element.all(by.css('#todo-list .completed')).count();
      var result  = 1;

      expect(subject).toBe(result);
    });


    it('should be able to clear completed items in the list', function() {

      var toggleAll = element(by.css('#toggle-all'));
      var viewDiv = element(by.css('.view'));

      toggleAll.click();

      var clearCompletedButton = element(by.css('#clear-completed'));
      browser.actions().mouseMove(clearCompletedButton).click().perform();

      var subject = viewDiv.isPresent();
      var result  = false;

      expect(subject).toBe(result);
    });

    it('should be able to add a todo to the list', function() {

      var newTodoInput = element(by.css('#new-todo'));

      var todoValue = getRandomTodo();
      newTodoInput.sendKeys(todoValue);
      newTodoInput.sendKeys(protractor.Key.ENTER);

      var subject = element.all(by.css('.view label')).last().getText();
      var result  = todoValue;

      expect(subject).toEqual(result);
    });

    it('should be able to remove a todo to the list', function() {

      var newTodoInput = element(by.css('#new-todo'));

      var todoValue = getRandomTodo();
      newTodoInput.sendKeys(todoValue);
      newTodoInput.sendKeys(protractor.Key.ENTER);


      browser.actions().mouseMove(element.all(by.css('.view label')).last()).perform();
      var el = element.all(by.css('.view button')).last();
      el.click();

      var subject = element.all(by.css('.view label')).last().getText();
      var result  = todoValue;

      expect(subject).not.toEqual(result);
    });

  });


  describe('Server and Client rendered', function() {
    beforeEach(function() {
      browser.get(appendQuery('/examples/todo', {
        server: true,
        client: true,
        preboot: false,
        bootstrap: true
      }));
      browser.driver.sleep(500);
    });

    it('should be able to complete a todo in the list', function() {

      var currentTodo = element.all(by.css('.view input')).first();
      browser.actions().mouseMove(currentTodo).click().perform();

      var subject = element.all(by.css('#todo-list .completed')).count();
      var result  = 1;

      expect(subject).toBe(result);
    });


    it('should be able to clear completed items in the list', function() {

      var toggleAll = element(by.css('#toggle-all'));
      var viewDiv = element(by.css('.view'));

      toggleAll.click();

      var clearCompletedButton = element(by.css('#clear-completed'));
      browser.actions().mouseMove(clearCompletedButton).click().perform();

      var subject = viewDiv.isPresent();
      var result  = false;

      expect(subject).toBe(result);
    });


    it('should be able to add a todo to the list', function() {

      var newTodoInput = element(by.css('#new-todo'));

      var todoValue = getRandomTodo();
      newTodoInput.sendKeys(todoValue);
      newTodoInput.sendKeys(protractor.Key.ENTER);

      var subject = element.all(by.css('.view label')).last().getText();
      var result  = todoValue;

      expect(subject).toEqual(todoValue);
    });

    it('should be able to remove a todo to the list', function() {

      var newTodoInput = element(by.css('#new-todo'));

      var todoValue = getRandomTodo();
      newTodoInput.sendKeys(todoValue);
      newTodoInput.sendKeys(protractor.Key.ENTER);


      browser.actions().mouseMove(element.all(by.css('.view label')).last()).perform();
      var el = element.all(by.css('.view button')).last();
      el.click();

      var subject = element.all(by.css('.view label')).last().getText();
      var result  = todoValue;

      expect(subject).not.toEqual(result);
    });

  });

  describe('Server and Client rendered with Preboot.js', function() {
    beforeEach(function() {
      browser.get(appendQuery('/examples/todo', {
        server: true,
        client: true,
        preboot: true,
        bootstrap: false
      }));
    });

    it('should be able maintain input values of initial server rendered input after client render', function() {

      var result = getRandomTodo();

      var serverInput = element(by.css('#new-todo'));

      // type value on input before bootstrap
      serverInput.sendKeys(result);

      // bootstrap async
      bootstrapClient({ async: true});

      var subject = element(by.css('#new-todo')).getAttribute('value');
      expect(subject).toEqual(result);

    });
    it('should be able maintain input values of server rendered input after client render', function() {

      var result = getRandomTodo();

      var serverInput = element(by.css('#new-todo'));

      // type value on input before bootstrap
      serverInput.sendKeys(result);

      // bootstrap async
      bootstrapClient({ async: true});

      // wait for bootstrap to finish
      browser.driver.sleep(800);

      // Query again for a new reference after bootstrap
      var subject = browser.executeScript(function() {
        return document.querySelectorAll('#new-todo')[0].value;
      });

      expect(subject).toEqual(result);
    });


    it('should be able maintain input values during initial bootstrap', function() {

      var result = getRandomTodo();

      var serverInput = element(by.css('#new-todo'));
      browser.wait(EC.elementToBeClickable(serverInput), 10000);

      // bootstrap async
      bootstrapClient({ async: true});
      // TODO: sometimes protractor doesn't send the keys correctly or preboot

      // type value on input during bootstrap
      serverInput.sendKeys(result);

      var subject = browser.executeScript(function() {
        return document.querySelectorAll('#new-todo')[0].value;
      });
      expect(subject).toEqual(result);
    });
    it('should be able maintain input values during client bootstrap', function() {

      var result = getRandomTodo();

      var serverInput = element(by.css('#new-todo'));
      browser.wait(EC.elementToBeClickable(serverInput), 10000);

      // bootstrap async
      bootstrapClient({ async: true});
      // TODO: sometimes protractor doesn't send the keys correctly or preboot

      // type value on input during bootstrap
      serverInput.sendKeys(result);

      // Query again for a new reference after bootstrap
      var subject = browser.executeScript(function() {
        return document.querySelectorAll('#new-todo')[0].value;
      });

      expect(subject).toEqual(result);
    });



  });

});

function getRandomTodo() {
  var value = 'new_todo_123456789_123456789_123456789_end';
  return value;
}

function getRandomNumber() {
  return Math.abs(Math.floor(Math.random() * 1656445656757765));
}

function bootstrapClient(config) {
  if (config.async !== true) {
    browser.driver.sleep(500);
  }
  config = config || {};
  var EC = protractor.ExpectedConditions;
  var bootstrapScript;
  if (config.focus !== true) {
    bootstrapScript = element(by.css('#bootstrapButton'));
    browser.wait(EC.elementToBeClickable(bootstrapScript), 10000);
  }

  if (config.focus === true) {
    browser.executeScript(function() {
      return window.bootstrap();
    });
  } else {
    bootstrapScript.click();
  }

  if (config.async !== true) {
    browser.driver.sleep(500);
  }
}
function verifyNoBrowserErrors() {
  // TODO(tbosch): Bug in ChromeDriver: Need to execute at least one command
  // so that the browser logs can be read out!
  browser.executeScript('1+1');
  browser.manage().logs().get('browser').then(function(browserLog) {
    var filteredLog = browserLog.filter(function(logEntry) {
      if (logEntry.level.value >= webdriver.logging.Level.INFO.value) {
        console.log('>> ' + logEntry.message);
      }
      return logEntry.level.value > webdriver.logging.Level.WARNING.value;
    });
    expect(filteredLog.length).toEqual(0);
  });
}

function appendQuery(url, options) {
  options.cacheBuster = getRandomNumber();
  return url + Object.keys(options).map(function(key) {
    return '&' + key + '=' + options[key];
  }).join('').replace('&', '?');
}
