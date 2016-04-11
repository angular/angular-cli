'use strict';

const fs = require('fs');
const path = require('path');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const stringUtils = require('ember-cli/lib/utilities/string');


module.exports = {
  description: 'Generates a route and a template.',

  availableOptions: [
    { name: 'skip-router-generation', type: Boolean, default: false, aliases: ['srg'] },
    { name: 'default', type: Boolean, default: false }
  ],

  afterInstall: function (options) {
    if (!options.skipRouterGeneration) {
      this._addRouteToParent(options);
    }
  },

  afterUninstall: function (options) {
    this._removeRouteFromParent(options);
  },

  normalizeEntityName: function (entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
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

  _findParentRouteFile: function() {
    const parentDir = path.join(this.project.root, this.dynamicPath.dir);
    let parentFile = path.join(parentDir, `${path.basename(this.dynamicPath.dir)}.ts`);

    if (parentDir == path.join(this.project.root, this.dynamicPath.appRoot)) {
      parentFile = path.join(parentDir, this.project.name() + '.ts');
    }

    if (fs.existsSync(parentFile)) {
      return parentFile;
    }
  },

  _removeRouteFromParent: function(options) {
    const parsedPath = this.dynamicPath;
    const parentFile = this._findParentRouteFile(options);
    if (!parentFile) {
      return;
    }

    const jsComponentName = stringUtils.classify(options.entity.name);
    const base = parsedPath.base;
    const name = parsedPath.name;

    let content = fs.readFileSync(parentFile, 'utf-8');
    const importTemplate = `import {${jsComponentName}} from './${base}/${name}';\n`;
    if (content.indexOf(importTemplate) == -1) {
      // Not found, nothing to do.
      return;
    }

    content = content.replace(importTemplate, '');

    const route = new RegExp(`^\\s*\\{.*name: '${jsComponentName}'.*component: ${jsComponentName}.*`
                           + '\\},?\\s*\\n?', 'm');
    content = content.replace(route, '');

    fs.writeFileSync(parentFile, content, 'utf-8');
  },

  _addRouteToParent: function(options) {
    const parsedPath = this.dynamicPath;
    const parentFile = this._findParentRouteFile();
    if (!parentFile) {
      return;
    }

    const jsComponentName = stringUtils.classify(options.entity.name);
    const base = parsedPath.base;
    const name = parsedPath.name;

    // Insert the import statement.
    let content = fs.readFileSync(parentFile, 'utf-8');
    const importTemplate = `import {${jsComponentName}} from './${base}/${name}';`;

    if (content.indexOf(importTemplate) != -1) {
      // Already there, do nothing.
      return;
    }

    // Find the last import and add an import to it.
    content = content.replace(/(import.+)\n(?!import)/m, function (f, m1) {
      return `${m1}\n${importTemplate}\n`;
    });

    let route = `{path: '/${base}/...', name: '${jsComponentName}', component: ${jsComponentName}},`;
    content = content.replace(/(@RouteConfig\(\[\s*\n)([\s\S\n]*?)(^\s*\]\))/m, function(_, m1, m2, m3) {
      if (m2.length) {
        // Add a `,` if there's none.
        m2 = m2.replace(/([^,])(\s*)\n$/, function (_, a1, a2) {
          return a1 + ',' + a2;
        });
      }
      return m1 + m2 + `  ${route}\n` + m3;
    });

    fs.writeFileSync(parentFile, content, 'utf-8');
  }
};
