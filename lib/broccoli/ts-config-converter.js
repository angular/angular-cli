var ts = require('typescript');
/**
 * Converts external tsconfig.json config to it's internal representation suitable for passing into
 * TypeScript language services.
 *
 * @param config
 * @returns {ts.CompilerOptions}
 */
function convertTsConfig(config) {
    return Object.keys(config).reduce(function (internalConfig, configKey) {
        var tsOption = tsOptionsMap[configKey];
        var configValue = config[configKey];
        switch (tsOption.type) {
            case 'string':
            case 'boolean':
                // keep value as is
                internalConfig[configKey] = configValue;
                break;
            default:
                if (tsOption.type instanceof Object) {
                    // convert external value to internal value
                    internalConfig[configKey] = tsOption.type[configValue];
                }
                else {
                    throw new Error('Unknown tsc option type: ' + tsOption.type);
                }
        }
        return internalConfig;
    }, {});
}
exports.convertTsConfig = convertTsConfig;
// copied and customized from:
// https://github.com/Microsoft/TypeScript/blob/302db0a9d58fe6b108c4ec455883fa7a3c4fd991/src/compiler/commandLineParser.ts#L8
var tscOptions = [
    {
        name: "charset",
        type: "string",
    },
    {
        name: "declaration",
        type: "boolean",
    },
    {
        name: "diagnostics",
        type: "boolean",
    },
    { name: "emitBOM", type: "boolean" },
    {
        name: "help",
        type: "boolean",
    },
    {
        name: "init",
        type: "boolean",
    },
    {
        name: "inlineSourceMap",
        type: "boolean",
    },
    {
        name: "inlineSources",
        type: "boolean",
    },
    {
        name: "jsx",
        type: { "preserve": 1 /* Preserve */, "react": 2 /* React */ },
    },
    {
        name: "listFiles",
        type: "boolean",
    },
    {
        name: "locale",
        type: "string",
    },
    {
        name: "mapRoot",
        type: "string",
    },
    {
        name: "module",
        type: {
            "commonjs": 1 /* CommonJS */,
            "amd": 2 /* AMD */,
            "system": 4 /* System */,
            "umd": 3 /* UMD */,
        },
    },
    {
        name: "newLine",
        type: { "crlf": 0 /* CarriageReturnLineFeed */, "lf": 1 /* LineFeed */ },
    },
    {
        name: "noEmit",
        type: "boolean",
    },
    { name: "noEmitHelpers", type: "boolean" },
    {
        name: "noEmitOnError",
        type: "boolean",
    },
    {
        name: "noImplicitAny",
        type: "boolean",
    },
    {
        name: "noLib",
        type: "boolean",
    },
    {
        name: "noResolve",
        type: "boolean",
    },
    {
        name: "skipDefaultLibCheck",
        type: "boolean",
    },
    {
        name: "out",
        type: "string",
    },
    {
        name: "outFile",
        type: "string",
    },
    {
        name: "outDir",
        type: "string",
    },
    {
        name: "preserveConstEnums",
        type: "boolean",
    },
    {
        name: "project",
        type: "string",
    },
    {
        name: "removeComments",
        type: "boolean",
    },
    {
        name: "rootDir",
        type: "string",
    },
    {
        name: "isolatedModules",
        type: "boolean",
    },
    {
        name: "sourceMap",
        type: "boolean",
    },
    {
        name: "sourceRoot",
        type: "string",
    },
    { name: "suppressExcessPropertyErrors", type: "boolean" },
    {
        name: "suppressImplicitAnyIndexErrors",
        type: "boolean",
    },
    { name: "stripInternal", type: "boolean" },
    {
        name: "target",
        type: {
            "es3": 0 /* ES3 */,
            "es5": 1 /* ES5 */,
            "es6": 2 /* ES6 */,
        },
    },
    {
        name: "version",
        type: "boolean",
    },
    {
        name: "watch",
        type: "boolean",
    },
    {
        name: "experimentalDecorators",
        type: "boolean",
    },
    {
        name: "emitDecoratorMetadata",
        type: "boolean",
    },
    {
        name: "moduleResolution",
        type: { "node": 2 /* NodeJs */, "classic": 1 /* Classic */ },
    }
];
/**
 * Creates a map out of the `tscOptions` array
 */
var tsOptionsMap = tscOptions.reduce(function (map, option) {
    map[option.name] = option;
    return map;
}, {});

//# sourceMappingURL=../broccoli/ts-config-converter.js.map