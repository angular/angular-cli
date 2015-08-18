var webdriver = require('selenium-webdriver');

describe('Test Page', function() {
  var EC = protractor.ExpectedConditions;
  afterEach(verifyNoBrowserErrors);

  describe('Server only render', function() {

    var config = {
      server: true,
      client: false,
      preboot: false,
      bootstrap: false
    };

    beforeEach(function() {
      browser.get(appendQuery('/', config));
     // browser.driver.sleep(1000);
    });

    runTestSuites(config);
    
  });

  describe('Client only render', function() {

    var config = {
      server: false,
      client: true,
      preboot: false,
      bootstrap: true
    };

    beforeEach(function() {
      browser.get(appendQuery('/', config));
      browser.driver.sleep(500); // should be greater or equal to 500ms
    });
    
    runTestSuites(config);
    
  });


  describe('Server and Client rendered', function() {
    
    var config = {
      server: true,
      client: true,
      preboot: false,
      bootstrap: true
    };
    
    beforeEach(function() {
      browser.get(appendQuery('/', config));
      browser.driver.sleep(500);
    });
    
    runTestSuites(config);

  });

  describe('Server and Client rendered with Preboot.js', function() {
    
    var config = {
      server: true,
      client: true,
      preboot: true,
      bootstrap: false
    };
    
    beforeEach(function() {
      browser.get(appendQuery('/', config));
    });
    
    runTestSuites(config);
    
    xit('should have correct selection in an input', function() {
      
    });
    
    xit('should have correct selection in an input during bootstrap', function() {
      
    })

  });

});

function runTestSuites(config) {
    var subject, result;
  
    it('should have a displayed input element', function() {
      subject = element.all(by.deepCss('#defaultValueInput')).isDisplayed();

      expect(subject).toBeTruthy();
      
    });

    it('should have default "value" property for inputs', function() {
      subject = browser.executeScript('return document.querySelector("#defaultValueInput").value');
      result = 'value8';
      
      expect(subject).toEqual(result);
      
    });
    
    if(config.server === false && config.client === true){
      
      it('should have a NULL "value" attribute (by default) for inputs', function() {
        subject = browser.executeScript('return document.querySelector("#defaultValueInput").getAttribute("value")');
  
        expect(subject).toBeNull();
        
      });
      
    }
    
    
    it('should have a defined "value" attribute for inputs', function() {
      subject = browser.executeScript(
        'document.querySelector("#defaultValueInput").setAttribute("value", "value8");'+
        'return document.querySelector("#defaultValueInput").getAttribute("value");'
      );
      result = 'value8';
      
      expect(subject).toEqual(result);
      
    });
    
    it('should have attribute "value" NOT EQUAL TO prop "value"', function() {
      browser.executeScript(
        'var input = document.querySelector("#defaultValueInput");'+
        'input.value = "PROP"; input.setAttribute("value", "ATTR");'
      );
      var subject_attr = browser.executeScript('return document.querySelector("#defaultValueInput").getAttribute("value")');
      var subject_prop = browser.executeScript('return document.querySelector("#defaultValueInput").value');
      
      expect(subject_attr).not.toEqual(subject_prop);
      
    });
    
    it('should be focused on page load', function() {
      subject = browser.executeScript('return document.activeElement && document.activeElement.value');
      result  = 'value8';

      expect(subject).toBe(result);
      
    });

    xit('should have checked values for checkbox inputs', function() {
      subject = element.all(by.deepCss('input[checked]:checked')).count();
      result  = 3;
      
      subject = browser.executeScript('return document.querySelectorAll("input[checked]").length');

      expect(subject).toBe(3);
    });

}

function bootstrapClient(config) {
  config = config || {};
  var EC = protractor.ExpectedConditions;
  var bootstrapButton = element(by.deepCss('#bootstrapButton'));
  browser.wait(EC.elementToBeClickable(bootstrapButton), 10000);
  bootstrapButton.click();
  if (!config.dontSleep) {
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
  return url + Object.keys(options).map(function(key) {
    return '&' + key + '=' + options[key];
  }).join('').replace('&', '?');
}
