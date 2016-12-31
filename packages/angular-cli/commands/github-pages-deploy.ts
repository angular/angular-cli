const Command = require('../ember-cli/lib/models/command');
import { oneLine } from 'common-tags';

export interface GithubPagesDeployOptions {
  message?: string;
  target?: string;
  environment?: string;
  userPage?: boolean;
  skipBuild?: boolean;
  ghToken?: string;
  ghUsername?: string;
  baseHref?: string;
}

const githubPagesDeployCommand = Command.extend({
  name: 'github-pages:deploy',
  aliases: ['gh-pages:deploy'],
  description: oneLine`
    Build the test app for production, commit it into a git branch,
    setup GitHub repo and push to it
  `,
  works: 'insideProject',

  availableOptions: [
    {
      name: 'message',
      type: String,
      default: 'new gh-pages version',
      description: 'The commit message to include with the build, must be wrapped in quotes.'
    }, {
      name: 'target',
      type: String,
      default: 'production',
      aliases: ['t', { 'dev': 'development' }, { 'prod': 'production' }]
    }, {
      name: 'environment',
      type: String,
      default: '',
      aliases: ['e']
    }, {
      name: 'user-page',
      type: Boolean,
      default: false,
      description: 'Deploy as a user/org page'
    }, {
      name: 'skip-build',
      type: Boolean,
      default: false,
      description: 'Skip building the project before deploying'
    }, {
      name: 'gh-token',
      type: String,
      default: '',
      description: 'Github token'
    }, {
      name: 'gh-username',
      type: String,
      default: '',
      description: 'Github username'
    }, {
      name: 'base-href',
      type: String,
      default: null,
      aliases: ['bh']
    }],

  run: function(options: GithubPagesDeployOptions, rawArgs: string[]) {
    return require('./github-pages-deploy.run').default.call(this, options, rawArgs);
  }
});


export default githubPagesDeployCommand;
