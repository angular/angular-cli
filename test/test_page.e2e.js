var webdriver = require('selenium-webdriver');

describe('Test Page', function() {
  var EC = protractor.ExpectedConditions;
  // afterEach(verifyNoBrowserErrors);

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

    // runTestSuites(config);

    it('should have initial checked values for checkbox inputs', function() {
      // attr
      var subject = element.all(by.deepCss('input[checked]:checked')).count();
      var result  = 3;


      expect(subject).toEqual(result);
    });
    it('should have checked values for checkbox inputs', function() {
      bootstrapClient();

      // prop
      var result = 3;
      var subject2 = browser.executeScript(function() {
        return Array.prototype.filter.call(document.querySelectorAll("input[type=checkbox]"), function(box) {
          return box.checked;
        }).length;
      });

      expect(subject2).toEqual(result);
    });

    it('should be focused on initial page load', function() {
      var result  = 'value8';
      var subject = browser.executeScript(function() {
        return document.activeElement && document.activeElement.value
      });

      expect(subject).toEqual(result);
    });
    it('should be focused on client page load', function() {
      bootstrapClient({focus: true});

      var result  = 'value8';
      var subject = browser.executeScript(function() {
        return document.activeElement && document.activeElement.value
      });
      expect(subject).toEqual(result);
    });

    it('should have correct selection in an input during initial render', function() {
      var result = [0,0];
      var selection = browser.executeScript(function() {
        return [
          document.querySelectorAll("#defaultValueInput")[0].selectionStart,
          document.querySelectorAll("#defaultValueInput")[0].selectionEnd
        ]
      });

      expect(selection).toEqual(result);
    });
    it('should have correct selection in an input after bootstrap', function() {
      bootstrapClient({focus: true});

      var result = [0,0];
      var selection = browser.executeScript(function() {
        return [
          document.querySelectorAll("#defaultValueInput")[0].selectionStart,
          document.querySelectorAll("#defaultValueInput")[0].selectionEnd
        ]
      });

      expect(selection).toEqual(result);
    });


  });


});

function runTestSuites(config, env) {
    var isPreboot      = config.preboot === true;
    var isServer       = config.server === true  && config.client === false;
    var isServerCilent = config.server === true  && config.client === true;
    var isClient       = config.server === false && config.client === true;

    var subject, result;

    it('should have a displayed input element', function() {
      subject = element.all(by.deepCss('#defaultValueInput')).isDisplayed();

      expect(subject).toBeTruthy();

    });

    it('should have default "value" property for inputs', function() {
      var subject = browser.executeScript(function() {
        return document.querySelector("#defaultValueInput").value;
      });
      var result = 'value8';

      expect(subject).toEqual(result);

    });

    if (isClient) {

      it('should have a NULL "value" attribute (by default) for inputs', function() {
        var subject = browser.executeScript(function() {
          return document.querySelector("#defaultValueInput").getAttribute("value");
        });

        expect(subject).toBeNull();

      });

    }


    it('should have a defined "value" attribute for inputs', function() {
      var subject = browser.executeScript(function() {
        document.querySelector("#defaultValueInput").setAttribute("value", "value8");
        return document.querySelector("#defaultValueInput").getAttribute("value");
      });
      var result = 'value8';

      expect(subject).toEqual(result);

    });

    it('should have attribute "value" NOT EQUAL TO prop "value"', function() {
      browser.executeScript(function() {
        var input = document.querySelector("#defaultValueInput");
        input.value = "PROP";
        input.setAttribute("value", "ATTR");
      });

      var subject_attr = browser.executeScript(function() {
        return document.querySelector("#defaultValueInput").getAttribute("value");
      });
      var subject_prop = browser.executeScript(function() {
        return document.querySelector("#defaultValueInput").value;
      });

      expect(subject_attr).not.toEqual(subject_prop);

    });

    if (!isServerCilent) {
      it('should be focused on page load', function() {
        var subject = browser.executeScript(function() {
          return document.activeElement && document.activeElement.value
        });

        var result  = 'value8';

        expect(subject).toBe(result);
      });
    }

    if (isServer) {

      it('should have checked values for checkbox inputs', function() {
        var subject = element.all(by.deepCss('input[checked]:checked')).count();
        var result  = 3;

        expect(subject).toEqual(result);

        var subject2 = browser.executeScript(function() {
          return document.querySelectorAll("input[checked]").length
        });

        expect(subject2).toEqual(result);
      });
    }

}

function bootstrapClient(config) {
  browser.driver.sleep(500);
  config = config || {};
  var EC = protractor.ExpectedConditions;
  var bootstrapScript;
  if (config.focus !== true) {
    bootstrapScript = element(by.deepCss('#bootstrapButton'));
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
