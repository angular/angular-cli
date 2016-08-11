var sep = require('path').sep;


export class SystemJSRegisterPublicModules {
  private registerModules: any;
  private bundlesConfigForChunks: any;

  constructor(options: any) {
    options = options || {};

    // default is public modules
    this.registerModules = options.registerModules || [{filter: 'public'}];

    this.bundlesConfigForChunks =
      typeof options.bundlesConfigForChunks == 'boolean' ? options.bundlesConfigForChunks : true;
  }


  // given the entry chunk, determine which modules are public
  // and create the manifest of public modules and chunks to public modules
  //
  // id to public name (if public, otherwise undefined)
  // manifest.registerModules = ['b', 'a', 'main', 'lodash', undefined, undefined];
  //
  // id to boolean, indicating which are ES module objects
  // manifest.esModules = [0,0,1,0,0];
  //
  // chunk id to list of public module ids in that chunk
  // manifest.chunks = [[0, 3]];
  getModuleLoaderManifest(modules, entryChunk, outputOptions, hash) {
    var bundlesConfigForChunks = this.bundlesConfigForChunks;
    var includes = this.registerModules;

    var manifest = {
      registerModules: [],
      esModules: [],
      chunks: []
    };

    var existingKeys = [];

    var path = outputOptions.path;

    // convert module objects into structured module objects for our own use
    var moduleObjs = modules.map(function (m) {
      return {
        id: m.id,
        request: m.rawRequest || '',
        path: m.resource || '',

        relPath: m.resource && m.resource.substr(0, path.length + 1) == path + sep ? m.resource.substr(path.length + 1) : m.resource || '',

        // NB TODO:
        // isPackageMain: true / false
        // packageName: from package.json / node_modules derivation
        // packageVersion: from package.json

        meta: m.meta
      };
    });

    // default filters and naming functions
    function publicFilter(module) {
      // is this good enough?
      return module.request.match(/^@[^\/\\]+\/\\[^\/\\]$|^[^\/\\]+$/);
    }

    function localFilter(module) {
      // modules outside of the project root are not considered local anymore
      if (module.path.substr(0, path.length) != path)
        return false;
      return !module.path.substr(path.length).match(/(^|\/|\\)node_modules(\/|\\|$)/);
    }

    function publicModuleName(module) {
      return module.request;
    }

    function localModuleName(module) {
      return module.relPath;
    }

    // determine includes
    includes.forEach(function (include, index) {
      var filter = include.filter;
      var publicKeyFn = include.keyname;

      // public key template function
      // we should really do this with better properties than the normal module entries
      if (typeof publicKeyFn == 'string') {
        var string = publicKeyFn;
        publicKeyFn = function (module, existingKeys) {
          var str = string;
          // allow simple templating
          for (var p in module) {
            if (module.hasOwnProperty(p))
              str = str.replace('[' + p + ']', module[p]);
          }
          return str;
        }
      }

      // default filters
      if (filter == 'all') {
        filter = function (module) {
          return true;
        };
        publicKeyFn = publicKeyFn || function (module, existingKeys) {
            if (publicFilter(module))
              return publicNames(module);
            else
              return localNames(module);
          };
      }
      else if (filter == 'public') {
        filter = publicFilter;
        publicKeyFn = publicKeyFn || publicModuleName;
      }
      else if (filter == 'local') {
        filter = localFilter;
        publicKeyFn = publicKeyFn || localModuleName;
      }

      if (!publicKeyFn)
        throw new TypeError('SystemJS register public modules plugin has no keyname function defined for filter ' + index);

      moduleObjs.filter(function (m) {
        return filter(m, existingKeys);
      }).forEach(function (m) {
        var publicKey = publicKeyFn(m, existingKeys);
        if (typeof publicKey != 'string')
          throw new TypeError('SystemJS register public modules plugin did not return a valid key for ' + m.path);
        if (existingKeys.indexOf(publicKey) != -1) {
          if (manifest.registerModules[m.id] != publicKey)
            throw new TypeError('SystemJS register public module ' + publicKey + ' is already defined to another module');
          existingKeys.push(publicKey);
        }
        manifest.registerModules[m.id] = publicKey;

        if (m.meta.harmonyModule)
          manifest.esModules[m.id] = true;
      });
    });

    // build up list of public modules against chunkids
    if (bundlesConfigForChunks) {
      function visitChunks(chunk, visitor) {
        visitor(chunk);
        chunk.chunks.forEach(visitor);
      }

      visitChunks(entryChunk, function (chunk) {
        var publicChunkModuleIds = [];
        chunk.modules.forEach(function (module) {
          if (manifest.registerModules[module.id])
            publicChunkModuleIds.push(module.id);
        });

        // is it possible for the main entry point to contain multiple chunks? how would we know what these are?
        // or is the main compilation always the first chunk?
        if (publicChunkModuleIds.length && chunk.id != entryChunk.id)
          manifest.chunks[chunk.id] = publicChunkModuleIds;
      });
    }

    return manifest;
  };

  apply(compiler) {
    var self = this;

    compiler.plugin('compilation', function (compilation) {
      var mainTemplate = compilation.mainTemplate;

      mainTemplate.plugin('bootstrap', function (source, chunk, hash) {
        var bundlesConfigForChunks = self.bundlesConfigForChunks;

        var publicModuleLoaderManifest = [];
        var publicModuleChunks = [];

        var manifest = self.getModuleLoaderManifest(compilation.modules, chunk, this.outputOptions, hash);

        function stringifySparseArray(arr) {
          return '[' + arr.map(function (value) {
              if (value === undefined)
                return '';
              else if (typeof value == 'boolean')
                return value ? 1 : 0;
              else
                return JSON.stringify(value);
            }).join(',').replace(/,+$/, '') + ']';
        }

        return this.asString([
          "var publicModuleLoaderManifest = " + stringifySparseArray(manifest.registerModules) + ";",
          "var publicESModules = " + stringifySparseArray(manifest.esModules) + ";",
          (bundlesConfigForChunks ? "var publicModuleChunks = " + stringifySparseArray(manifest.chunks) + ";" : ""),
          source
        ]);
      });

      mainTemplate.plugin('add-module', function (source) {
        return this.asString([
          source,
          "defineIfPublicSystemJSModule(moduleId);"
        ]);
      });

      mainTemplate.plugin('require-extensions', function (source, chunk, hash) {
        var bundlesConfigForChunks = self.bundlesConfigForChunks;

        var output = [source];

        if (bundlesConfigForChunks) {
          var chunkMaps = chunk.getChunkMaps();
          var chunkFilename = this.outputOptions.chunkFilename;
console.log(chunkMaps);
          output.push("var systemJSBundlesConfig = {};");
          output.push("for (var chunkId in publicModuleChunks) {");
          output.push(this.indent([
            "var moduleIds = publicModuleChunks[chunkId];",
            "var moduleNames = [];",
            "for (var i = 0; i < moduleIds.length; i++)",
            this.indent([
              "moduleNames.push(publicModuleLoaderManifest[moduleIds[i]]);",
            ]),

            // this is copied from https://github.com/webpack/webpack/blob/master/lib/JsonpMainTemplatePlugin.js#L43
            "systemJSBundlesConfig[" + this.requireFn + ".p + " +
            this.applyPluginsWaterfall("asset-path", JSON.stringify(chunkFilename), {
              hash: "\" + " + this.renderCurrentHashCode(hash) + " + \"",
              hashWithLength: function (length) {
                return "\" + " + this.renderCurrentHashCode(hash, length) + " + \"";
              }.bind(this),
              chunk: {
                id: "\" + chunkId + \"",
                hash: "\" + " + JSON.stringify(chunkMaps.hash) + "[chunkId] + \"",
                hashWithLength: function (length) {
                  var shortChunkHashMap = {};
                  Object.keys(chunkMaps.hash).forEach(function (chunkId) {
                    if (typeof chunkMaps.hash[chunkId] === "string")
                      shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
                  });
                  return "\" + " + JSON.stringify(shortChunkHashMap) + "[chunkId] + \"";
                },
                name: "\" + (" + JSON.stringify(chunkMaps.name) + "[chunkId]||chunkId) + \""
              }
            }) + "] = moduleNames;"
          ]));
          output.push("}");

          // this check could potentially left out to assume SystemJS-only and throw otherwise,
          // but it seems nice to make it optional
          output.push("var hasSystemJS = typeof SystemJS != 'undefined';");

          output.push("if (hasSystemJS)");
          output.push(this.indent(["SystemJS.config({ bundles: systemJSBundlesConfig });"]));
        }

        output.push("function defineIfPublicSystemJSModule(moduleId) {");
        output.push("var publicKey = publicModuleLoaderManifest[moduleId];");
        output.push("if (publicKey && hasSystemJS)");
        output.push(this.indent([
          "if (publicESModules[moduleId])",
          this.indent([
            "SystemJS.register(publicKey, [], function($__export) {",
            // this could be moved into execution scope
            this.indent([
              "$__export(__webpack_require__(moduleId));"
            ]),
            "});"
          ]),
          "else",
          this.indent([
            "SystemJS.registerDynamic(publicKey, [], false, function() {",
            this.indent([
              "return __webpack_require__(moduleId);"
            ]),
            "});"
          ])
        ]));
        output.push("}");
        output.push("for (var moduleId in modules)");
        output.push(this.indent([
          "if (Object.prototype.hasOwnProperty.call(modules, moduleId))",
          this.indent(["defineIfPublicSystemJSModule(moduleId);"])
        ]));

        return this.asString(output);
      });
    });
  }
}