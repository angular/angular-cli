import * as ts from 'typescript';
import { satisfies } from 'semver';

const needsNodeSymbolFix = satisfies(ts.version, '< 2.5.2');

export interface Transformer<T extends ts.Node = ts.SourceFile> {
  initialize(
    transformationContext: ts.TransformationContext,
    programContext: ProgramContext,
  ): void;
  reset?(): void;
  transform?(node: T): T;
}

export abstract class AbstractTransformer implements Transformer {
  private _transformationContext: ts.TransformationContext | null = null;
  private _programContext: ProgramContext | null = null;

  protected get transformationContext(): ts.TransformationContext {
    if (!this._transformationContext) {
      throw new Error('transformer is not initialized');
    }
    return this._transformationContext;
  }

  protected get programContext(): ProgramContext {
    if (!this._programContext) {
      throw new Error('transformer is not initialized');
    }
    return this._programContext;
  }

  initialize(transformationContext: ts.TransformationContext, programContext: ProgramContext) {
    this._transformationContext = transformationContext;
    this._programContext = programContext;
  }

  protected visitEachChild<T extends ts.Node>(node: T, visitor: ts.Visitor): T {
    return ts.visitEachChild(node, visitor, this.transformationContext);
  }

  protected getDecoratorOrigin(decorator: ts.Decorator): DecoratorOrigin {
    return getDecoratorOrigin(decorator, this.programContext.getTypeChecker());
  }
}

export interface ProgramContext {
  getTypeChecker(): ts.TypeChecker;
}

export interface TransformerFactoryOptions<TNode> {
  getTypeChecker?: () => ts.TypeChecker;
  exclude?: (node: TNode) => boolean;
}

export function createTransformerFactory<TNode extends ts.Node>(
  transformer: Transformer<TNode>,
  options: TransformerFactoryOptions<TNode> = {},
): ts.TransformerFactory<TNode> {
  const programContext: ProgramContext = {
    getTypeChecker: () => {
      if (!options.getTypeChecker) {
        throw new Error('type checker is not available');
      }
      return options.getTypeChecker();
    },
  };

  const factory: ts.TransformerFactory<TNode> = transformationContext => {
    transformer.initialize(transformationContext, programContext);

    if (transformer.reset) {
      transformer.reset();
    }

    if (!transformer.transform) {
      return node => node;
    }

    return node => {
      if (options.exclude && options.exclude(node)) {
        return node;
      }

      const result = transformer.transform(node);

      if (transformer.reset) {
        transformer.reset();
      }

      if (result && needsNodeSymbolFix) {
        const original = ts.getParseTreeNode(result);
        // tslint:disable-next-line:no-any - 'symbol' is internal
        (result as any).symbol = (result as any).symbol || (original as any).symbol;
      }

      return result;
    };
  };

  return factory;
}

export interface DecoratorOrigin {
  name: string;
  module: string;
}

function getDecoratorOrigin(
  decorator: ts.Decorator,
  typeChecker: ts.TypeChecker
): DecoratorOrigin | null {
  if (!ts.isCallExpression(decorator.expression)) {
    return null;
  }

  let identifier: ts.Node;
  let name: string;
  if (ts.isPropertyAccessExpression(decorator.expression.expression)) {
    identifier = decorator.expression.expression.expression;
    name = decorator.expression.expression.name.text;
  } else if (ts.isIdentifier(decorator.expression.expression)) {
    identifier = decorator.expression.expression;
  } else {
    return null;
  }

  // NOTE: resolver.getReferencedImportDeclaration would work as well but is internal
  const symbol = typeChecker.getSymbolAtLocation(identifier);
  if (symbol && symbol.declarations && symbol.declarations.length > 0) {
    const declaration = symbol.declarations[0];
    let module: string;
    if (ts.isImportSpecifier(declaration)) {
      name = (declaration.propertyName || declaration.name).text;
      module = (declaration.parent.parent.parent.moduleSpecifier as ts.StringLiteral).text;
    } else if (ts.isNamespaceImport(declaration)) {
      // Use the name from the decorator namespace property access
      module = (declaration.parent.parent.moduleSpecifier as ts.StringLiteral).text;
    } else if (ts.isImportClause(declaration)) {
      name = declaration.name.text;
      module = (declaration.parent.moduleSpecifier as ts.StringLiteral).text;
    } else {
      return null;
    }

    return { name, module };
  }

  return null;
}
