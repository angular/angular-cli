export declare function buildOptimizer(options: BuildOptimizerOptions): TransformJavascriptOutput;

export declare const buildOptimizerLoaderPath: string;

export declare class BuildOptimizerWebpackPlugin {
    apply(compiler: Compiler): void;
}

export default function buildOptimizerLoader(this: {
    resourcePath: string;
    _module: {
        factoryMeta: {
            skipBuildOptimizer?: boolean;
            sideEffectFree?: boolean;
        };
    };
    cacheable(): void;
    callback(error?: Error | null, content?: string, sourceMap?: unknown): void;
}, content: string, previousSourceMap: RawSourceMap): void;

export declare function getPrefixClassesTransformer(): ts.TransformerFactory<ts.SourceFile>;

export declare function getPrefixFunctionsTransformer(): ts.TransformerFactory<ts.SourceFile>;

export declare function getScrubFileTransformer(program?: ts.Program): ts.TransformerFactory<ts.SourceFile>;

export declare function getScrubFileTransformerForCore(program?: ts.Program): ts.TransformerFactory<ts.SourceFile>;

export declare function getWrapEnumsTransformer(): ts.TransformerFactory<ts.SourceFile>;

export declare function transformJavascript(options: TransformJavascriptOptions): TransformJavascriptOutput;
