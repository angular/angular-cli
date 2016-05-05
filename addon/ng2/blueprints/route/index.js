'use strict';

const fs = require('fs');
const path = require('path');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const stringUtils = require('ember-cli-string-utils');
const Blueprint = require('ember-cli/lib/models/blueprint');


function _regexEscape(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}


function _insertImport(content, symbolName, fileName) {
  // Check if an import from the same file is there.
  const importRegex = new RegExp('' +
      /^(import\s+\{)/.source +  // 1. prefix
      /(.*?)/.source +  // 2. current imports
      `(\\} from '${_regexEscape(fileName)}';)` +  // 3. suffix
      '\\n', 'm'
  );

  const m = content.match(importRegex);
  if (m) {
    // console.log(m[2], symbolName, m[2].);
    if (m[2].match(new RegExp(`\\b${_regexEscape(symbolName)}\\b`))) {
      // Already in the symbol list.
      return content;
    }

    return content.substr(0, m.index) + m[1] + m[2] + ', ' + symbolName + m[3] + '\n'
          + content.substr(m.index + m[0].length);
  }

  const importTemplate = `import { ${symbolName} } from '${fileName}';`;
  // Find the last import and add an import to it.
  content = content.replace(/(import.+)\n(?!import)/m, function (f, m1) {
    return `${m1}\n${importTemplate}\n`;
  });

  return content;
}

function _removeImport(content, symbolName, fileName) {
  const importRegex = new RegExp('' +
      /^(import\s+\{)/.source +  // prefix
      /(.*?),?/.source +  // symbolsPre
      '\\b' + _regexEscape(symbolName) + '\\b' +  // symbol
      ',?' + '(.*?)' +  // symbolsPost
      `(} from '${_regexEscape(fileName)}'\\s*;)` +  // suffix
      '\\n', 'm'
  );

  return content.replace(importRegex, function(_, prefix, symbolsPre, symbol, symbolsPost, suffix) {
    if (symbolsPre == '' && symbolsPost == '') {
      // Nothing before or after, remove the line.
      return '';
    }
    if (symbolsPre == '') {
      // Nothing before.
      return prefix + symbolsPost + suffix;
    }
    if (symbolsPost == '') {
      // Nothing after.
      return prefix + symbolsPre + suffix;
    }
    // Something before and after, add a `,`.
    return prefix + symbolsPre + ',' + symbolsPost + suffix;
  });
}

function _addRoutes(content) {
  // If an annotation is already there, just ignore this.
  if (content.indexOf('@Routes') !== -1) {
    return content;
  }

  // Add the imports.
  content = _insertImport(content, 'Routes', '@angular/router');
  content = _insertImport(content, 'ROUTER_DIRECTIVES', '@angular/router');

  // Add the router config.
  const m = content.match(/(@Component\(\{[\s\S\n]*?}\)\n)(\s*export class)/m);
  if (!m) {
    // No component.
    // eslint-disable-next-line no-console
    console.warn('No component annotation was found...');
    return content;
  }

  content = content.substr(0, m.index) + m[1] + '@Routes([\n])\n'
          + m[2] + content.substr(m.index + m[0].length);

  return content;
}


module.exports = {
  description: 'Generates a route and a template.',

  availableOptions: [
    { name: 'skip-router-generation', type: Boolean, default: false, aliases: ['srg'] },
    { name: 'default', type: Boolean, default: false },
    { name: 'lazy', type: Boolean, default: true },
    { name: 'inline-template', type: Boolean, default: false, aliases: ['it'] },
    { name: 'inline-style', type: Boolean, default: false, aliases: ['is'] },
    { name: 'prefix', type: Boolean, default: true },
    { name: 'path', type: String }
  ],

  beforeInstall: function(options) {
    options.route = true;
    if (options.lazy) {
      options.isLazyRoute = true;
    }
    return Blueprint.load(path.join(__dirname, '..', 'component')).install(options);
  },

  afterInstall: function (options) {
    if (!options.skipRouterGeneration) {
      this._addRouteToParent(options);
      this._verifyParentRoute(options);
    }
  },

  afterUninstall: function (options) {
    this._removeRouteFromParent(options);
  },

  normalizeEntityName: function (entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);

    // If a specified route starts with `+` remove it as it'd break convention.
    if (parsedPath.name[0] === '+') {
      var index = entityName.lastIndexOf(parsedPath.name);
      entityName = entityName.substr(0, index) + entityName.substr(index + 1);
    }

    this.dynamicPath = parsedPath;

    //leave the entity name intact for component generation
    return entityName;
  },

  locals: function () {
    return {
      dynamicPath: this.dynamicPath.dir.replace(this.dynamicPath.appRoot, '')
    };
  },

  fileMapTokens: function (options) {
    // Return custom template variables here.
    return {
      __path__: () => {
        var dir = this.dynamicPath.dir;
        if (!options.locals.flat) {
          dir += path.sep + options.dasherizedModuleName;
        }
        return dir;
      }
    };
  },

  _findParentRouteFile: function(dir) {
    const parentDir = path.isAbsolute(dir) ? dir : path.join(this.project.root, dir);
    // Remove the `+` if it's the first character.
    const routeName = path.basename(dir).substr(path.basename(dir)[0] == '+' ? 1 : 0);
    let parentFile = path.join(parentDir, `${routeName}.component.ts`);

    if (parentDir == path.join(this.project.root, this.dynamicPath.appRoot)) {
      parentFile = path.join(parentDir, this.project.name() + '.component.ts');
    }

    if (fs.existsSync(parentFile)) {
      return parentFile;
    }

    // Try without the .component.  Old routes won't have it, or users might rename it.
    parentFile = path.join(parentDir, `${path.basename(dir)}.ts`);
    if (fs.existsSync(parentFile)) {
      return parentFile;
    }

    return null;
  },

  _removeRouteFromParent: function(options) {
    const parsedPath = this.dynamicPath;
    const parentFile = this._findParentRouteFile(this.dynamicPath.dir);
    if (!parentFile) {
      return;
    }

    const jsComponentName = stringUtils.classify(options.entity.name);
    const base = parsedPath.base;

    let content = fs.readFileSync(parentFile, 'utf-8');
    content = _removeImport(content, `${jsComponentName}Component`,
                            `./${options.isLazyRoute ? '+' : ''}${base}`);

    const route = new RegExp(`^\\s*\\{.*name: '${jsComponentName}'.*component: ${jsComponentName}.*`
                           + '\\},?\\s*\\n?', 'm');
    content = content.replace(route, '');

    fs.writeFileSync(parentFile, content, 'utf-8');
  },

  _addRouteToParent: function(options) {
    const parsedPath = this.dynamicPath;
    const parentFile = this._findParentRouteFile(this.dynamicPath.dir);
    if (!parentFile) {
      return;
    }

    let isAppComponent = false;
    let appComponentFile = 
      path.join(this.project.root, 
        this.dynamicPath.dir, 
        this.project.name() + '.component.ts');
    if (parentFile == appComponentFile) {
      isAppComponent = true;
    }

    const jsComponentName = stringUtils.classify(options.entity.name);
    const base = parsedPath.base;

    // Insert the import statement.
    let content = fs.readFileSync(parentFile, 'utf-8');
    content = _insertImport(content, `${jsComponentName}Component`,
                            `./${options.isLazyRoute ? '+' : ''}${stringUtils.dasherize(base)}`);

    let defaultReg = options.default ? ', useAsDefault: true' : '';
    let routePath = options.path || `/${base}`;
    let route = '{'
              +   `path: '${routePath}', `
              +   `component: ${jsComponentName}Component`
              +   defaultReg
              + '}';

    // Add the route configuration.
    content = _addRoutes(content);
    content = content.replace(/(@Routes\(\[\s*\n)([\s\S\n]*?)(^\s*\]\))/m, function(_, m1, m2, m3) {
      if (m2.length) {
        // Add a `,` if there's none.
        m2 = m2.replace(/([^,])(\s*)\n$/, function (_, a1, a2) {
          return a1 + ',\n' + a2;
        });
      }
      return m1 + m2 + `  ${route}\n` + m3;
    });

    // Add the directive.
    content = content.replace(/(@Component\(\{)([\s\S\n]*?)(\n\}\))/m, function(_, prefix, json, suffix) {
      const m = json.match(/(^\s+directives:\s*\[)([\s\S\n]*)(\]\s*,?.*$)/m);
      if (m) {
        if (m[2].indexOf('ROUTER_DIRECTIVES') != -1) {
          // Already there.
          return _;
        }

        // There's a directive already, but no ROUTER_DIRECTIVES.
        return prefix +
          json.replace(/(^\s+directives:\s*\[)([\s\S\n]*)(^\]\s*,?.*$)/m, function(_, prefix, d, suffix) {
            return prefix + d + (d ? ',' : '') + 'ROUTER_DIRECTIVES' + suffix;
          }) + suffix;
      } else {
        // There's no directive already.
        return prefix + json + ',\n  directives: [ROUTER_DIRECTIVES]' + suffix;
      }
    });

    // Add the provider, only on the APP itself.
    if (isAppComponent) {
      content = _insertImport(content, 'ROUTER_DIRECTIVES', '@angular/router');
      content = _insertImport(content, 'ROUTER_PROVIDERS', '@angular/router');
      content = content.replace(/(@Component\(\{)([\s\S\n]*?)(\n\}\))/m, function (_, prefix, json, suffix) {
        const m = json.match(/(^\s+providers:\s*\[)([\s\S\n]*)(\]\s*,?.*$)/m);
        if (m) {
          if (m[2].indexOf('ROUTER_PROVIDERS') != -1) {
            // Already there.
            return _;
          }

          // There's a directive already, but no ROUTER_PROVIDERS.
          return prefix +
            json.replace(/(^\s+providers:\s*\[)([\s\S\n]*)(^\]\s*,?.*$)/m, function (_, prefix, d, suffix) {
              return prefix + d + (d ? ',' : '') + 'ROUTER_PROVIDERS' + suffix;
            }) + suffix;
        } else {
          // There's no directive already.
          return prefix + json + ',\n  providers: [ROUTER_PROVIDERS]' + suffix;
        }
      });
    }

    // Change the template.
    content = content.replace(/(@Component\(\{)([\s\S\n]*?)(\}\))/m, function(_, prefix, json, suffix) {
      const m = json.match(/(^\s+template:\s*\[)([\s\S\n]*)(\]\s*,?.*$)/m);

      if (m) {
        if (m[2].indexOf('<router-outlet></router-outlet>') != -1) {
          // Already there.
          return _;
        }

        // There's a template already, but no <router-outlet>.
        return prefix +
          json.replace(/(^\s+template:\s*`)([\s\S\n]*?)(`,?.*$)/m, function(_, prefix, t, suffix) {
            return prefix + t + '<router-outlet></router-outlet>' + suffix;
          }) + suffix;
      } else {
        // There's no template, look for the HTML file.
        const htmlFile = parentFile.replace(/\.ts$/, '.html');
        if (!fs.existsSync(htmlFile)) {
          // eslint-disable-next-line no-console
          console.log('Cannot find HTML: ' + htmlFile);

          // Can't be found, exit early.
          return _;
        }

        let html = fs.readFileSync(htmlFile, 'utf-8');
        if (html.indexOf('<router-outlet></router-outlet>') == -1) {
          html += '\n<router-outlet></router-outlet>';

          fs.writeFileSync(htmlFile, html, 'utf-8');
        }
        return _;
      }
    });

    fs.writeFileSync(parentFile, content, 'utf-8');
  },

  _verifyParentRoute: function() {
    const parsedPath = this.dynamicPath;
    const parentFile = this._findParentRouteFile(parsedPath.dir);
    if (!parentFile) {
      return;
    }

    const gParentDir = path.dirname(path.dirname(parentFile));
    const gParentFile = this._findParentRouteFile(gParentDir);

    if (!gParentFile) {
      return;
    }

    let parentComponentName = path.basename(parsedPath.dir);
    if (parentComponentName[0] == '+') parentComponentName = parentComponentName.substr(1);
    const jsComponentName = stringUtils.classify(parentComponentName);
    const routeRegex = new RegExp(`^\\s*\\{.*component: ${jsComponentName}.*`
      + '\\},?\\s*\\n?', 'm');

    let content = fs.readFileSync(gParentFile, 'utf-8');
    const m = content.match(routeRegex);
    if (m) {
      // Replace `path: '/blah'` with the proper `path: '/blah/...'`.
      let json = m[0].replace(/(path:\s*['"])([^'"]+?)(['"])/, function(m, prefix, value, suffix) {
        // If the path isn't ending with `...`, add it (with a URL separator).
        if (!value.match(/\.\.\.$/)) {
          if (!value.match(/\/$/)) {
            value += '/';
          }
          value += '...';
        }
        return prefix + value + suffix;
      });
      content = content.substr(0, m.index) + json + content.substr(m.index + m[0].length);
    }

    fs.writeFileSync(gParentFile, content, 'utf-8');
  }
};
