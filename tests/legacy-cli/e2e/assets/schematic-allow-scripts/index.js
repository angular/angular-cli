const tasks = require("@angular-devkit/schematics/tasks");

exports.default = ({ allowScripts, ignoreScripts = false }) => {
    return (tree, context) => {
        tree.create('/install-test/package.json', JSON.stringify({
            name: 'install-test',
            version: '0.0.0',
            scripts: {
                postinstall: `node run-post.js`,
            }
        }));
        tree.create('/install-test/.npmrc', `ignore-scripts=${ignoreScripts}`);
        tree.create('/install-test/run-post.js', 'require("fs").writeFileSync(__dirname + "/post-script-ran", "12345");')
        context.addTask(new tasks.NodePackageInstallTask({ workingDirectory: 'install-test', allowScripts }));
    };
};
