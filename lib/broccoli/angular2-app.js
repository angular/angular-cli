var typescriptTrees = require('./broccoli-typescript').default;
var mergeTrees = require('broccoli-merge-trees');
var pickFiles = require('broccoli-static-compiler');

module.exports = Angular2App;

function Angular2App() {

}

Angular2App.prototype.toTree = function () {
    var sourceTree = 'src';

    var jsTree = new typescriptTrees(sourceTree, {
        allowNonTsExtensions: false,
        declaration: true,
        emitDecoratorMetadata: true,
        mapRoot: '',           // force sourcemaps to use relative path
        noEmitOnError: false,  // temporarily ignore errors, we type-check only via cjs build
        rootDir: '.',
        sourceMap: true,
        sourceRoot: '.',
        target: 'ES5'
    });

    var htmlTree = pickFiles(sourceTree, {
        srcDir: '.',
        files: ['**/*.html'],
        destDir: '.'
    });

    return mergeTrees([jsTree, htmlTree]);
};