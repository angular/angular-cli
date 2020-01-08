export declare class SchematicTestRunner {
    get engine(): SchematicEngine<{}, {}>;
    get logger(): logging.Logger;
    get tasks(): TaskConfiguration[];
    constructor(_collectionName: string, collectionPath: string);
    callRule(rule: Rule, tree: Tree, parentContext?: Partial<SchematicContext>): Observable<Tree>;
    registerCollection(collectionName: string, collectionPath: string): void;
    runExternalSchematic<SchematicSchemaT>(collectionName: string, schematicName: string, opts?: SchematicSchemaT, tree?: Tree): UnitTestTree;
    runExternalSchematicAsync<SchematicSchemaT>(collectionName: string, schematicName: string, opts?: SchematicSchemaT, tree?: Tree): Observable<UnitTestTree>;
    runSchematic<SchematicSchemaT>(schematicName: string, opts?: SchematicSchemaT, tree?: Tree): UnitTestTree;
    runSchematicAsync<SchematicSchemaT>(schematicName: string, opts?: SchematicSchemaT, tree?: Tree): Observable<UnitTestTree>;
}

export declare class UnitTestTree extends DelegateTree {
    get files(): string[];
    readContent(path: string): string;
}
