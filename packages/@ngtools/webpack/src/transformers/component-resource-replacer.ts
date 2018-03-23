import * as ts from 'typescript';
import { AbstractTransformer } from './transformer';

export enum ReplacerMode {
  Analyze,
  Inline,
  Require
}

export class ComponentResourceReplacerOptions {
  fullAstWalk = false;
  urlMode = ReplacerMode.Require;
  onResourceFound?: (resource: string, sourceFilename: string) => void;
  fetchResource?: (resource: string, sourceFilename: string) => string | undefined;
  transformContent?: (content: string, inline: boolean) => string;
}

export class ComponentResourceTransformer extends AbstractTransformer {
  private _currentSourceFile: ts.SourceFile | null;
  private _componentStyles: Array<ts.Expression>;

  constructor(
    private readonly options: Partial<ComponentResourceReplacerOptions> = {},
  ) {
    super();
    this.options = { ...new ComponentResourceReplacerOptions(), ...options };

    if (options.urlMode === ReplacerMode.Inline && !options.fetchResource) {
      throw new Error('inline mode requires the fetch resource option to be defined');
    }
  }

  reset() {
    this._currentSourceFile = null;
  }

  transform(file: ts.SourceFile): ts.SourceFile {
    this._currentSourceFile = file;

    const visitor: ts.Visitor = node => {
      if (ts.isClassDeclaration(node)) {
        node.decorators = ts.visitNodes(
          node.decorators,
          (node: ts.Decorator) => this._replaceResources(node),
        );
      }

      return this.options.fullAstWalk ? this.visitEachChild(node, visitor) : node;
    };

    return this.visitEachChild(file, visitor);
  }

  private _isComponentDecorator(node: ts.Node): node is ts.Decorator {
    if (!ts.isDecorator(node)) {
      return false;
    }

    const origin = this.getDecoratorOrigin(node);
    if (origin && origin.module === '@angular/core' && origin.name === 'Component') {
      return true;
    }

    return false;
  }

  private _normalizeUrl(url: string): string {
    return `${/^\.?\.\//.test(url) ? '' : './'}${url}`;
  }

  private _analyzeUrlExpression(node: ts.Expression): ts.Expression {
    // only analyze strings
    if (!ts.isStringLiteral(node)) {
      return node;
    }

    const rawUrl = node.text;
    const normalizedUrl = this._normalizeUrl(rawUrl);

    if (this.options.onResourceFound) {
      this.options.onResourceFound(normalizedUrl, this._currentSourceFile.fileName);
    }

    if (rawUrl === normalizedUrl) {
      return node;
    }

    const updatedNode = ts.createLiteral(normalizedUrl);

    return updatedNode;
  }

  private _transformUrlExpression(node: ts.Expression) {
    const requireArgument = this._analyzeUrlExpression(node);

    if (this.options.urlMode === ReplacerMode.Require) {
      const requireCall = ts.createCall(
        ts.createIdentifier('require'),
        undefined,
        [requireArgument]
      );

      return requireCall;
    } else if (this.options.urlMode === ReplacerMode.Inline && ts.isStringLiteral(node)) {
      let content = this.options.fetchResource(node.text, this._currentSourceFile.fileName);
      if (!content) {
        return undefined;
      }

      if (this.options.transformContent) {
        content = this.options.transformContent(content, false);
      }

      if (!content || content.trim().length === 0) {
        return undefined;
      }

      return ts.createLiteral(content);
    }

    // unsupported node - return directly
    return node;
  }

  private _visitInlineStyle(node: ts.Expression): ts.VisitResult<ts.Expression> {
    // TODO: fold constants

    // leave nodes other than string literals as is
    if (!ts.isStringLiteral(node)) {
      return node;
    }

    // transform content if option is configured
    if (this.options.transformContent) {
      const content = this.options.transformContent(node.text, true);
      if (!content || content.trim().length === 0) {
        return undefined;
      }

      return ts.createLiteral(content);
    }

    // filter out string values that lack content
    if (node.text.trim().length === 0) {
      return undefined;
    }

    return node;
  }

  private _replaceResources(node: ts.Decorator): ts.Decorator {
    if (!this._isComponentDecorator(node)) {
      // not a component decorator
      return node;
    }
    if (!ts.isCallExpression(node.expression)) {
      // Error: unsupported syntax
      return node;
    }

    const decoratorFactory = node.expression;
    const args = decoratorFactory.arguments;
    if (args.length !== 1 || args[0].kind !== ts.SyntaxKind.ObjectLiteralExpression) {
      // Error: unsupported component metadata
      return node;
    }

    this._componentStyles = [];
    const objectExpression = args[0] as ts.ObjectLiteralExpression;
    const properties = ts.visitNodes(
      objectExpression.properties,
      (node: ts.ObjectLiteralElementLike) => this._visitComponentMetaData(node),
    );
    if (this._componentStyles.length > 0) {
      const styleAssignment = ts.createPropertyAssignment(
        ts.createIdentifier('styles'),
        ts.createArrayLiteral(this._componentStyles)
      );
      properties.push(styleAssignment);
    }
    args[0] = ts.updateObjectLiteral(
      objectExpression,
      properties
    );

    return ts.updateDecorator(
      node,
      ts.updateCall(
        decoratorFactory,
        decoratorFactory.expression,
        decoratorFactory.typeArguments,
        args
      )
    );
  }

  private _visitComponentMetaData(
    node: ts.ObjectLiteralElementLike
  ): ts.VisitResult<ts.ObjectLiteralElementLike> {
    if (!ts.isPropertyAssignment(node)) {
      // Error: unsupported
      return node;
    }

    if (ts.isComputedPropertyName(node.name)) {
      // computed names are not supported
      return node;
    }

    const name = node.name.text;
    switch (name) {
      case 'moduleId':
        // remove
        return undefined;
      case 'styleUrls':
        // update
        if (!ts.isArrayLiteralExpression(node.initializer)) {
          // Error: unsupported
          return node;
        }
        const styleUrls = node.initializer.elements;
        if (styleUrls.length === 0) {
          return undefined;
        }
        if (this.options.urlMode === ReplacerMode.Analyze) {
          styleUrls.forEach(element => this._analyzeUrlExpression(element));
          return node;
        }
        const transformedUrls = ts.visitNodes(
          styleUrls,
          (node: ts.Expression) => this._transformUrlExpression(node)
        );
        this._componentStyles = this._componentStyles.concat(transformedUrls);

        // combined styles are added after visitor
        return undefined;
      case 'templateUrl':
        // update
        if (this.options.urlMode === ReplacerMode.Analyze) {
          this._analyzeUrlExpression(node.initializer);
          return node;
        }
        return ts.updatePropertyAssignment(
          node,
          ts.createIdentifier('template'),
          this._transformUrlExpression(node.initializer)
        );
      case 'styles':
        // combine with styleUrls; styles (this) first
        if (!ts.isArrayLiteralExpression(node.initializer)) {
          // Error: unsupported
          return node;
        }

        const inlineStyles = ts.visitNodes(
          node.initializer.elements,
          (node: ts.Expression) => this._visitInlineStyle(node),
        );
        this._componentStyles.unshift(...inlineStyles);

        // combined styles are added after visitor
        return undefined;
      case 'template':
        // TODO: Warn about both inline & url; also, priority?
      default:
        return node;
    }
  }

}
