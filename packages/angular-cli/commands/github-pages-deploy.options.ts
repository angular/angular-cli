export const availableOptions: any = [
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
    description: 'GitHub token'
  }, {
    name: 'gh-username',
    type: String,
    default: '',
    description: 'GitHub username'
  }, {
    name: 'base-href',
    type: String,
    default: null,
    aliases: ['bh']
  }, {
    name: 'custom-domain',
    type: String,
    default: null,
    aliases: ['cd'],
    description: 'Custom domain for Github Pages'
  }, {
    name: 'aot',
    type: Boolean,
    default: false,
  }, {
    name: 'vendor-chunk',
    type: Boolean,
    default: false,
  }];
