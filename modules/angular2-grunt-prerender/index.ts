import * as GruntAngular2Prerender from './src/prerender';

export * from './src/prerender';

// needs to be written like this otherwise Grunt will fail to load this task
module.exports = GruntAngular2Prerender;
