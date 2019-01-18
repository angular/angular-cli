export declare function buildOptimizer(options: BuildOptimizerOptions): TransformJavascriptOutput;

export default function buildOptimizerLoader(this: webpack.loader.LoaderContext, content: string, previousSourceMap: RawSourceMap): void;

export declare function getFoldFileTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile>;

export declare function getImportTslibTransformer(): ts.TransformerFactory<ts.SourceFile>;

export declare function getPrefixClassesTransformer(): ts.TransformerFactory<ts.SourceFile>;

export declare function getPrefixFunctionsTransformer(): ts.TransformerFactory<ts.SourceFile>;

export declare function getScrubFileTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile>;

export declare function getScrubFileTransformerForCore(program: ts.Program): ts.TransformerFactory<ts.SourceFile>;

export declare function getWrapEnumsTransformer(): ts.TransformerFactory<ts.SourceFile>;

export declare function testImportTslib(content: string): boolean;

export declare function testPrefixClasses(content: string): boolean;

export declare function testScrubFile(content: string): boolean;

export declare function transformJavascript(options: TransformJavascriptOptions): TransformJavascriptOutput;
