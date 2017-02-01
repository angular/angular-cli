const Command = require('../ember-cli/lib/models/command');
import { oneLine } from 'common-tags';
import { availableOptions } from './github-pages-deploy.options';

export interface GithubPagesDeployOptions {
    message?: string;
    target?: string;
    environment?: string;
    userPage?: boolean;
    skipBuild?: boolean;
    ghToken?: string;
    ghUsername?: string;
    baseHref?: string;
    customDomain?: string;
    aot?: boolean;
    vendorChunk?: boolean;
}

const GithubPagesDeployCommand = Command.extend({
    name: 'github-pages:deploy',
    aliases: ['gh-pages:deploy'],
    description: oneLine`
    Build the test app for production, commit it into a git branch,
    setup GitHub repo and push to it
  `,
    works: 'insideProject',

    availableOptions: availableOptions,

    run: function(options: GithubPagesDeployOptions, rawArgs: string[]) {
        return require('./github-pages-deploy.run').default.call(this, options, rawArgs);
    }
});


export default GithubPagesDeployCommand;
