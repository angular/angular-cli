'use strict';

var chalk = require('chalk');
var EOL   = require('os').EOL;

module.exports = function(initialMargin, shouldDescriptionBeGrey) {
  initialMargin = initialMargin || '';

  var output = '';

  var options = this.anonymousOptions;

  // <anonymous-option-1> ...
  if (options.length) {
    output += ' ' + chalk.yellow(options.map(function(option) {
      // blueprints we insert brackets, commands already have them
      if (option.indexOf('<') === 0) {
        return option;
      } else {
        return '<' + option + '>';
      }
    }).join(' '));
  }

  options = this.availableOptions
    .filter(function(option) { return !option.hidden; });

  // <options...>
  if (options.length) {
    output += ' ' + chalk.cyan('<options...>');
  }

  // Description
  var description = this.description;
  if (description) {
    if (shouldDescriptionBeGrey) {
      description = chalk.grey(description);
    }
    output += EOL + initialMargin + '  ' + description;
  }

  // aliases: a b c
  if (this.aliases && this.aliases.length) {
    output += EOL + initialMargin + '  ' + chalk.grey('aliases: ' + this.aliases.filter(function(a) { return a; }).join(', '));
  }

  // --available-option (Required) (Default: value)
  // ...
  options.forEach(function(option) {
    output += EOL + initialMargin + '  ' + chalk.cyan('--' + option.name);

    if (option.values) {
      output += chalk.cyan('=' + option.values.join('|'));
    }

    if (option.type) {
      var types = Array.isArray(option.type) ?
        option.type.map(formatType).join(', ') :
        formatType(option.type);

      output += ' ' + chalk.cyan('(' + types + ')');
    }

    if (option.required) {
      output += ' ' + chalk.cyan('(Required)');
    }

    if (option.default !== undefined) {
      output += ' ' + chalk.cyan('(Default: ' + option.default + ')');
    }

    if (option.description) {
      output += ' ' + option.description;
    }

    if (option.aliases && option.aliases.length) {
      output += EOL + initialMargin + '    ' + chalk.grey('aliases: ' + option.aliases.map(function(a) {
        if (typeof a === 'string') {
          return (a.length > 4 ? '--' : '-') + a + (option.type === Boolean ? '' : ' <value>');
        } else {
          var key = Object.keys(a)[0];
          return (key.length > 4 ? '--' : '-') + key + ' (--' + option.name + '=' + a[key] + ')';
        }
      }).join(', '));
    }
  });

  return output;
};

function formatType(type) {
  return typeof type === 'string' ? type : type.name;
}
