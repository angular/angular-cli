export declare function buildOptimizer(options: BuildOptimizerOptions): TransformJavascriptOutput;

export declare const buildOptimizerLoaderPath: string;

export declare class BuildOptimizerWebpackPlugin {
    apply(compiler: Compiler): void;
}

export default function buildOptimizerLoader(this: webpack.loader.LoaderContext, content: string, previousSourceMap: RawSourceMap): void;

export declare function getFoldFileTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile>;

export declare function getImportTslibTransformer(): ts.TransformerFactory<ts.SourceFile>;

export declare function getPrefixClassesTransformer(): ts.TransformerFactory<ts.SourceFile>;

export declare function getPrefixFunctionsTransformer(): ts.TransformerFactory<ts.SourceFile>;

export declare function getScrubFileTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile>;

export declare function getScrubFileTransformerForCore(program: ts.Program): ts.TransformerFactory<ts.SourceFile>;

export declare function getWrapEnumsTransformer(): ts.TransformerFactory<ts.SourceFile>;

export declare function transformJavascript(options: TransformJavascriptOptions): TransformJavascriptOutput;
