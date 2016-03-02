var stringUtils = require('ember-cli/lib/utilities/string');
var path = require('path');
var process = require('process');

module.exports = {
  description: '',
  
  normalizeEntityName: function(entityName){
    var cwd = this.project.cli.testing
      ? process.cwd()
      : process.env.PWD;
      
    var rootPath = path.join(this.project.root, 'src', 'app');
    
    var outputPath = path.join(rootPath, entityName);
    
    if (entityName.indexOf(path.sep) === 0) {
      outputPath = path.join(rootPath, entityName.substr(1));
    } else if (cwd.indexOf(rootPath) >= 0) {
      outputPath = path.join(cwd, entityName);
    } else if (cwd.indexOf(path.join(this.project.root, 'src')) >= 0
               && entityName.indexOf('app') === 0) {
      outputPath = path.join(cwd, entityName);
    } else if (cwd.indexOf(path.join(this.project.root, 'src')) >= 0) {
      outputPath = path.join(cwd, 'app', entityName);
    }
    
    if (outputPath.indexOf(rootPath) < 0) {
      throw `Invalid component path: "${entityName}" cannot be ` +
        `above the "${path.join('src', 'app')}" directory`; 
    }
    
    var adjustedPath = outputPath.replace(rootPath, '');
    
    var parsedPath = path.parse(adjustedPath);
    this.dynamicPath = {
      name: parsedPath.name,
      path: parsedPath.dir
    };
    return parsedPath.name;
  },
  
  locals: function(options){
    return {
      dynamicPath: this.dynamicPath.path
    }
  },

  fileMapTokens: function(options) {
    // Return custom template variables here.
    return {
      __name__: (options) => {
        return this.dynamicPath.name;
      },
      __path__: (options) => {
        return this.dynamicPath.path;
      }
    };
  }
};
