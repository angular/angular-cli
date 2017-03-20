import {CliConfig} from '../../models/config';
import {getAppFromConfig} from '../../utilities/app-utils';

const path = require('path');
const Blueprint   = require('../../ember-cli/lib/models/blueprint');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const getFiles = Blueprint.prototype.files;

export default Blueprint.extend({
  description: '',
  aliases: ['m'],

  availableOptions: [
    {
      name: 'spec',
      type: Boolean,
      description: 'Specifies if a spec file is generated.'
    },
    {
      name: 'flat',
      type: Boolean,
      description: 'Flag to indicate if a dir is created.'
    },
    {
      name: 'routing',
      type: Boolean,
      default: false,
      description: 'Specifies if a routing module file should be generated.'
    },
    {
      name: 'app',
      type: String,
      aliases: ['a'],
      description: 'Specifies app name to use.'
    }
  ],

  normalizeEntityName: function (entityName: string) {
    this.entityName = entityName;
    const appConfig = getAppFromConfig(this.options.app);
    const parsedPath = dynamicPathParser(this.project, entityName, appConfig);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function (options: any) {
    options.flat = options.flat !== undefined ?
      options.flat : CliConfig.getValue('defaults.module.flat');

    options.spec = options.spec !== undefined ?
      options.spec : CliConfig.getValue('defaults.module.spec');

    return {
      dynamicPath: this.dynamicPath.dir,
      flat: options.flat,
      spec: options.spec,
      routing: options.routing
    };
  },

  files: function() {
    let fileList = getFiles.call(this) as Array<string>;

    if (!this.options || !this.options.spec) {
      fileList = fileList.filter(p => p.indexOf('__name__.module.spec.ts') < 0);
    }
    if (this.options && !this.options.routing) {
      fileList = fileList.filter(p => p.indexOf('__name__-routing.module.ts') < 0);
    }

    return fileList;
  },

  fileMapTokens: function (options: any) {
    // Return custom template variables here.
    this.dasherizedModuleName = options.dasherizedModuleName;
    return {
      __path__: () => {
        this.generatePath = this.dynamicPath.dir;
        if (!options.locals.flat) {
          this.generatePath += path.sep + options.dasherizedModuleName;
        }
        return this.generatePath;
      }
    };
  }
});
