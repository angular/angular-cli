/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';

export function downlevelConstructorParameters(
  getTypeChecker: () => ts.TypeChecker,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const transformer = decoratorDownlevelTransformer(getTypeChecker(), []);

    return transformer(context);
  };
}

// The following is sourced from tsickle with local modifications
// Only the creation of `ctorParameters` is retained
// tslint:disable-next-line:max-line-length
// https://github.com/angular/tsickle/blob/0ceb7d6bc47f6945a6c4c09689f1388eb48f5c07/src/decorator_downlevel_transformer.ts
//

/**
 * Extracts the type of the decorator (the function or expression invoked), as well as all the
 * arguments passed to the decorator. Returns an AST with the form:
 *
 *     // For @decorator(arg1, arg2)
 *     { type: decorator, args: [arg1, arg2] }
 */
function extractMetadataFromSingleDecorator(
  decorator: ts.Decorator,
  diagnostics: ts.Diagnostic[],
): ts.ObjectLiteralExpression {
  const metadataProperties: ts.ObjectLiteralElementLike[] = [];
  const expr = decorator.expression;
  switch (expr.kind) {
    case ts.SyntaxKind.Identifier:
      // The decorator was a plain @Foo.
      metadataProperties.push(ts.createPropertyAssignment('type', expr));
      break;
    case ts.SyntaxKind.CallExpression:
      // The decorator was a call, like @Foo(bar).
      const call = expr as ts.CallExpression;
      metadataProperties.push(ts.createPropertyAssignment('type', call.expression));
      if (call.arguments.length) {
        const args: ts.Expression[] = [];
        for (const arg of call.arguments) {
          args.push(arg);
        }
        const argsArrayLiteral = ts.createArrayLiteral(args);
        argsArrayLiteral.elements.hasTrailingComma = true;
        metadataProperties.push(ts.createPropertyAssignment('args', argsArrayLiteral));
      }
      break;
    default:
      diagnostics.push({
        file: decorator.getSourceFile(),
        start: decorator.getStart(),
        length: decorator.getEnd() - decorator.getStart(),
        messageText: `${
          ts.SyntaxKind[decorator.kind]
        } not implemented in gathering decorator metadata`,
        category: ts.DiagnosticCategory.Error,
        code: 0,
      });
      break;
  }

  return ts.createObjectLiteral(metadataProperties);
}

/**
 * createCtorParametersClassProperty creates a static 'ctorParameters' property containing
 * downleveled decorator information.
 *
 * The property contains an arrow function that returns an array of object literals of the shape:
 *     static ctorParameters = () => [{
 *       type: SomeClass|undefined,  // the type of the param that's decorated, if it's a value.
 *       decorators: [{
 *         type: DecoratorFn,  // the type of the decorator that's invoked.
 *         args: [ARGS],       // the arguments passed to the decorator.
 *       }]
 *     }];
 */
function createCtorParametersClassProperty(
  diagnostics: ts.Diagnostic[],
  entityNameToExpression: (n: ts.EntityName) => ts.Expression | undefined,
  ctorParameters: ParameterDecorationInfo[],
): ts.PropertyDeclaration {
  const params: ts.Expression[] = [];

  for (const ctorParam of ctorParameters) {
    if (!ctorParam.type && ctorParam.decorators.length === 0) {
      params.push(ts.createNull());
      continue;
    }

    const paramType = ctorParam.type
      ? typeReferenceToExpression(entityNameToExpression, ctorParam.type)
      : undefined;
    const members = [
      ts.createPropertyAssignment('type', paramType || ts.createIdentifier('undefined')),
    ];

    const decorators: ts.ObjectLiteralExpression[] = [];
    for (const deco of ctorParam.decorators) {
      decorators.push(extractMetadataFromSingleDecorator(deco, diagnostics));
    }
    if (decorators.length) {
      members.push(ts.createPropertyAssignment('decorators', ts.createArrayLiteral(decorators)));
    }
    params.push(ts.createObjectLiteral(members));
  }

  const initializer = ts.createArrowFunction(
    undefined,
    undefined,
    [],
    undefined,
    ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    ts.createArrayLiteral(params, true),
  );

  const ctorProp = ts.createProperty(
    undefined,
    [ts.createToken(ts.SyntaxKind.StaticKeyword)],
    'ctorParameters',
    undefined,
    undefined,
    initializer,
  );

  return ctorProp;
}

/**
 * Returns an expression representing the (potentially) value part for the given node.
 *
 * This is a partial re-implementation of TypeScript's serializeTypeReferenceNode. This is a
 * workaround for https://github.com/Microsoft/TypeScript/issues/17516 (serializeTypeReferenceNode
 * not being exposed). In practice this implementation is sufficient for Angular's use of type
 * metadata.
 */
function typeReferenceToExpression(
  entityNameToExpression: (n: ts.EntityName) => ts.Expression | undefined,
  node: ts.TypeNode,
): ts.Expression | undefined {
  let kind = node.kind;
  if (ts.isLiteralTypeNode(node)) {
    // Treat literal types like their base type (boolean, string, number).
    kind = node.literal.kind;
  }
  switch (kind) {
    case ts.SyntaxKind.FunctionType:
    case ts.SyntaxKind.ConstructorType:
      return ts.createIdentifier('Function');
    case ts.SyntaxKind.ArrayType:
    case ts.SyntaxKind.TupleType:
      return ts.createIdentifier('Array');
    case ts.SyntaxKind.TypePredicate:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
    case ts.SyntaxKind.BooleanKeyword:
      return ts.createIdentifier('Boolean');
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.StringKeyword:
      return ts.createIdentifier('String');
    case ts.SyntaxKind.ObjectKeyword:
      return ts.createIdentifier('Object');
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.NumericLiteral:
      return ts.createIdentifier('Number');
    case ts.SyntaxKind.TypeReference:
      const typeRef = node as ts.TypeReferenceNode;

      // Ignore any generic types, just return the base type.
      return entityNameToExpression(typeRef.typeName);
    default:
      return undefined;
  }
}

/** ParameterDecorationInfo describes the information for a single constructor parameter. */
interface ParameterDecorationInfo {
  /**
   * The type declaration for the parameter. Only set if the type is a value (e.g. a class, not an
   * interface).
   */
  type: ts.TypeNode | null;
  /** The list of decorators found on the parameter, null if none. */
  decorators: ts.Decorator[];
}

/**
 * Transformer factory for the decorator downlevel transformer. See fileoverview for details.
 */
export function decoratorDownlevelTransformer(
  typeChecker: ts.TypeChecker,
  diagnostics: ts.Diagnostic[],
): (context: ts.TransformationContext) => ts.Transformer<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    /** A map from symbols to the identifier of an import, reset per SourceFile. */
    let importNamesBySymbol = new Map<ts.Symbol, ts.Identifier>();

    /**
     * Converts an EntityName (from a type annotation) to an expression (accessing a value).
     *
     * For a given ts.EntityName, this walks depth first to find the leftmost ts.Identifier, then
     * converts the path into property accesses.
     *
     * This generally works, but TypeScript's emit pipeline does not serialize identifiers that are
     * only used in a type location (such as identifiers in a TypeNode), even if the identifier
     * itself points to a value (e.g. a class). To avoid that problem, this method finds the symbol
     * representing the identifier (using typeChecker), then looks up where it was imported (using
     * importNamesBySymbol), and then uses the imported name instead of the identifier from the type
     * expression, if any. Otherwise it'll use the identifier unchanged. This makes sure the
     * identifier is not marked as stemming from a "type only" expression, causing it to be emitted
     * and causing the import to be retained.
     */
    function entityNameToExpression(name: ts.EntityName): ts.Expression | undefined {
      const sym = typeChecker.getSymbolAtLocation(name);
      if (!sym) {
        return undefined;
      }
      // Check if the entity name references a symbol that is an actual value. If it is not, it
      // cannot be referenced by an expression, so return undefined.
      let symToCheck = sym;
      if (symToCheck.flags & ts.SymbolFlags.Alias) {
        symToCheck = typeChecker.getAliasedSymbol(symToCheck);
      }
      if (!(symToCheck.flags & ts.SymbolFlags.Value)) {
        return undefined;
      }

      if (ts.isIdentifier(name)) {
        // If there's a known import name for this symbol, use it so that the import will be
        // retained and the value can be referenced.
        const value = importNamesBySymbol.get(sym);
        if (value) {
          return value;
        }

        // Otherwise this will be a locally declared name, just return that.
        return name;
      }
      const ref = entityNameToExpression(name.left);
      if (!ref) {
        return undefined;
      }

      return ts.createPropertyAccess(ref, name.right);
    }

    /**
     * Transforms a constructor. Returns the transformed constructor and the list of parameter
     * information collected, consisting of decorators and optional type.
     */
    function transformConstructor(
      ctor: ts.ConstructorDeclaration,
    ): [ts.ConstructorDeclaration, ParameterDecorationInfo[]] {
      ctor = ts.visitEachChild(ctor, visitor, context);

      const parametersInfo: ParameterDecorationInfo[] = [];
      for (const param of ctor.parameters) {
        const paramInfo: ParameterDecorationInfo = { decorators: [], type: null };

        for (const decorator of param.decorators || []) {
          paramInfo.decorators.push(decorator);
        }
        if (param.type) {
          // param has a type provided, e.g. "foo: Bar".
          // The type will be emitted as a value expression in entityNameToExpression, which takes
          // care not to emit anything for types that cannot be expressed as a value (e.g.
          // interfaces).
          paramInfo.type = param.type;
        }
        parametersInfo.push(paramInfo);
      }

      return [ctor, parametersInfo];
    }

    /**
     * Transforms a single class declaration:
     * - creates a ctorParameters property
     */
    function transformClassDeclaration(classDecl: ts.ClassDeclaration): ts.ClassDeclaration {
      if (!classDecl.decorators || classDecl.decorators.length === 0) {
        return classDecl;
      }

      const newMembers: ts.ClassElement[] = [];
      let classParameters: ParameterDecorationInfo[] | null = null;

      for (const member of classDecl.members) {
        switch (member.kind) {
          case ts.SyntaxKind.Constructor: {
            const ctor = member as ts.ConstructorDeclaration;
            if (!ctor.body) {
              break;
            }

            const [newMember, parametersInfo] = transformConstructor(
              member as ts.ConstructorDeclaration,
            );
            classParameters = parametersInfo;
            newMembers.push(newMember);
            continue;
          }
          default:
            break;
        }
        newMembers.push(ts.visitEachChild(member, visitor, context));
      }

      const newClassDeclaration = ts.getMutableClone(classDecl);

      if (classParameters) {
        newMembers.push(
          createCtorParametersClassProperty(diagnostics, entityNameToExpression, classParameters),
        );
      }

      newClassDeclaration.members = ts.setTextRange(
        ts.createNodeArray(newMembers, newClassDeclaration.members.hasTrailingComma),
        classDecl.members,
      );

      return newClassDeclaration;
    }

    function visitor(node: ts.Node): ts.Node {
      switch (node.kind) {
        case ts.SyntaxKind.SourceFile: {
          importNamesBySymbol = new Map<ts.Symbol, ts.Identifier>();

          return ts.visitEachChild(node, visitor, context);
        }
        case ts.SyntaxKind.ImportDeclaration: {
          const impDecl = node as ts.ImportDeclaration;
          if (impDecl.importClause) {
            const importClause = impDecl.importClause;
            const names = [];
            if (importClause.name) {
              names.push(importClause.name);
            }
            if (
              importClause.namedBindings &&
              importClause.namedBindings.kind === ts.SyntaxKind.NamedImports
            ) {
              const namedImports = importClause.namedBindings as ts.NamedImports;
              names.push(...namedImports.elements.map(e => e.name));
            }
            for (const name of names) {
              const sym = typeChecker.getSymbolAtLocation(name);
              if (sym) {
                importNamesBySymbol.set(sym, name);
              }
            }
          }

          return ts.visitEachChild(node, visitor, context);
        }
        case ts.SyntaxKind.ClassDeclaration: {
          return transformClassDeclaration(node as ts.ClassDeclaration);
        }
        default:
          return ts.visitEachChild(node, visitor, context);
      }
    }

    return (sf: ts.SourceFile) => visitor(sf) as ts.SourceFile;
  };
}
