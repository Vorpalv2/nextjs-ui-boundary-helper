import ts from "typescript";

type BoundaryKind =
  | "server"
  | "client"
  | "suspense"
  | "cache"
  | "cache-private"
  | "cache-remote"
  | "server-only"
  | "client-only"
  | "server-action";

type ComponentMetadata = {
  totalLines: number;
  usesState: boolean;
  usesEffect: boolean;
  isAsync: boolean;
  hasTopLevelAwait: boolean;
  parameters: string[];
  returnType: string;
};

const packageImport = "ui-boundary-helper";

/** Adds debug wrappers to component returns and common Suspense/Server Action UI. */
export function transformBoundaries(source: string, fileName: string) {
  const scriptKind = fileName.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : fileName.endsWith(".jsx")
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind);
  const moduleDirectives = getDirectives(sourceFile.statements);

  if (moduleDirectives.includes("use server")) return source;
  const baseName = fileName.split(/[\\/]/).pop() ?? "";
  if (/^layout\.(tsx|jsx)$/i.test(baseName) && containsHtmlRoot(sourceFile)) return source;

  const moduleKind = getModuleKind(sourceFile, moduleDirectives);
  const fileLabel = fileName.split(/[\\/]/).pop() ?? fileName;
  let needsImport = false;
  let needsSuspenseReporterImport = false;
  let generatedName = "__UiBoundaryDebug";
  let suffix = 0;
  while (source.includes(generatedName)) generatedName = `__UiBoundaryDebug${++suffix}`;
  let generatedReporterName = "__UiBoundarySuspenseStatus";
  let reporterSuffix = 0;
  while (source.includes(generatedReporterName)) generatedReporterName = `__UiBoundarySuspenseStatus${++reporterSuffix}`;

  const factory = ts.factory;
  let transformationContext: ts.TransformationContext;

  const wrap = (
    expression: ts.Expression,
    kinds: BoundaryKind[],
    name: string,
    metadata?: ComponentMetadata,
    suspenseId?: string,
  ) => {
    needsImport = true;
    const attributes: ts.JsxAttributeLike[] = [
      factory.createJsxAttribute(factory.createIdentifier("name"), factory.createStringLiteral(name)),
    ];
    if (suspenseId) {
      attributes.push(factory.createJsxAttribute(factory.createIdentifier("suspenseId"), factory.createStringLiteral(suspenseId)));
    }
    if (metadata) {
      attributes.push(
        factory.createJsxAttribute(
          factory.createIdentifier("metadata"),
          factory.createJsxExpression(undefined, factory.createObjectLiteralExpression([
            factory.createPropertyAssignment("totalLines", factory.createNumericLiteral(metadata.totalLines)),
            factory.createPropertyAssignment("usesState", metadata.usesState ? factory.createTrue() : factory.createFalse()),
            factory.createPropertyAssignment("usesEffect", metadata.usesEffect ? factory.createTrue() : factory.createFalse()),
            factory.createPropertyAssignment("isAsync", metadata.isAsync ? factory.createTrue() : factory.createFalse()),
            factory.createPropertyAssignment("hasTopLevelAwait", metadata.hasTopLevelAwait ? factory.createTrue() : factory.createFalse()),
            factory.createPropertyAssignment("parameters", factory.createArrayLiteralExpression(metadata.parameters.map((parameter) => factory.createStringLiteral(parameter)))),
            factory.createPropertyAssignment("returnType", factory.createStringLiteral(metadata.returnType)),
          ], false)),
        ),
      );
    }
    if (kinds.length === 1) {
      attributes.unshift(
        factory.createJsxAttribute(factory.createIdentifier("kind"), factory.createStringLiteral(kinds[0])),
      );
    } else {
      attributes.unshift(
        factory.createJsxAttribute(
          factory.createIdentifier("kinds"),
          factory.createJsxExpression(
            undefined,
            factory.createArrayLiteralExpression(kinds.map((kind) => factory.createStringLiteral(kind))),
          ),
        ),
      );
    }

    const opening = factory.createJsxOpeningElement(
      factory.createIdentifier(generatedName),
      undefined,
      factory.createJsxAttributes(attributes),
    );
    const closing = factory.createJsxClosingElement(factory.createIdentifier(generatedName));
    return factory.createJsxElement(
      opening,
      [factory.createJsxExpression(undefined, expression)],
      closing,
    );
  };

  const visitor: ts.Visitor = (node) => {
    if (isComponentRenderMethod(node)) {
      const kinds = getFunctionKinds(node, moduleKind, moduleDirectives);
      const metadata = getComponentMetadata(node, sourceFile, source);
      const transformedBody = visitComponentBody(node.body!, visitor, (expression) => {
        return containsJsx(expression) ? wrap(expression, kinds, fileLabel, metadata) : expression;
      }, transformationContext);
      return factory.updateMethodDeclaration(
        node,
        node.modifiers,
        node.asteriskToken,
        node.name,
        node.questionToken,
        node.typeParameters,
        node.parameters,
        node.type,
        transformedBody,
      );
    }

    if (isComponentFunction(node)) {
      const name = fileLabel;
      const kinds = getFunctionKinds(node, moduleKind, moduleDirectives);
      const metadata = getComponentMetadata(node, sourceFile, source);

      if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
        const body = ts.visitNode(node.body, visitor) as ts.Expression;
        const transformedBody = containsJsx(body) ? wrap(body, kinds, name, metadata) : body;
        return factory.updateArrowFunction(
          node,
          node.modifiers,
          node.typeParameters,
          node.parameters,
          node.type,
          node.equalsGreaterThanToken,
          transformedBody,
        );
      }
      if (!node.body || !ts.isBlock(node.body)) return node;

      const transformedBody = visitComponentBody(node.body, visitor, (expression) => {
        return containsJsx(expression) ? wrap(expression, kinds, name, metadata) : expression;
      }, transformationContext);
      if (ts.isFunctionDeclaration(node)) {
        return factory.updateFunctionDeclaration(
          node,
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.typeParameters,
          node.parameters,
          node.type,
          transformedBody,
        );
      }
      if (ts.isFunctionExpression(node)) {
        return factory.updateFunctionExpression(
          node,
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.typeParameters,
          node.parameters,
          node.type,
          transformedBody,
        );
      }
      return factory.updateArrowFunction(
        node,
        node.modifiers,
        node.typeParameters,
        node.parameters,
        node.type,
        node.equalsGreaterThanToken,
        transformedBody,
      );
    }

    if (ts.isJsxElement(node)) {
      const visited = ts.visitEachChild(node, visitor, transformationContext);
      const tagName = node.openingElement.tagName.getText(sourceFile).split(".").pop();
      if (tagName === "Suspense") {
        const wrappedComponent = findFirstComponentName(visited.children, sourceFile) ?? `${fileLabel} children`;
        const suspenseId = `${fileName}:${node.pos}`;
        const instrumentedSuspense = addSuspenseStatusReporters(visited, suspenseId, generatedReporterName, factory);
        needsSuspenseReporterImport = true;
        return wrap(instrumentedSuspense, ["suspense"], wrappedComponent, undefined, suspenseId);
      }

      const actionForm = getActionForm(visited, sourceFile);
      if (actionForm) {
        return wrap(visited, ["server-action"], actionForm, findActionMetadata(actionForm, sourceFile, source));
      }
      return visited;
    }

    if (ts.isJsxSelfClosingElement(node)) {
      const visited = ts.visitEachChild(node, visitor, transformationContext);
      if (visited.tagName.getText(sourceFile) === "form" && hasActionAttribute(visited.attributes)) {
        const actionName = getActionAttributeName(visited.attributes, sourceFile) ?? "inlineServerAction";
        return wrap(visited, ["server-action"], actionName, findActionMetadata(actionName, sourceFile, source));
      }
      return visited;
    }

    return ts.visitEachChild(node, visitor, transformationContext);
  };

  const transformedResult = ts.transform(sourceFile, [
    (context) => {
      transformationContext = context;
      return (root) => ts.visitNode(root, visitor) as ts.SourceFile;
    },
  ]);
  const transformed = transformedResult.transformed[0];
  if (!needsImport) {
    transformedResult.dispose();
    return source;
  }

  const importDeclaration = factory.createImportDeclaration(
    undefined,
    factory.createImportClause(
      false,
      undefined,
      factory.createNamedImports([
        factory.createImportSpecifier(false, factory.createIdentifier("DebugBoundary"), factory.createIdentifier(generatedName)),
        ...(needsSuspenseReporterImport
          ? [factory.createImportSpecifier(false, factory.createIdentifier("SuspenseStatusReporter"), factory.createIdentifier(generatedReporterName))]
          : []),
      ]),
    ),
    factory.createStringLiteral(packageImport),
    undefined,
  );
  const directiveCount = getDirectives(transformed.statements).length;
  const updatedFile = factory.updateSourceFile(transformed, [
    ...transformed.statements.slice(0, directiveCount),
    importDeclaration,
    ...transformed.statements.slice(directiveCount),
  ]);
  const output = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(updatedFile);
  transformedResult.dispose();
  return output;
}

function addSuspenseStatusReporters(
  suspense: ts.JsxElement,
  id: string,
  reporterName: string,
  factory: ts.NodeFactory,
) {
  const statusAttributes = (status: "waiting" | "resolved") => factory.createJsxAttributes([
    factory.createJsxAttribute(factory.createIdentifier("id"), factory.createStringLiteral(id)),
    factory.createJsxAttribute(factory.createIdentifier("status"), factory.createStringLiteral(status)),
  ]);
  const waitingTag = factory.createIdentifier(reporterName);
  const fallbackMarker = factory.createJsxElement(
    factory.createJsxOpeningElement(waitingTag, undefined, statusAttributes("waiting")),
    [],
    factory.createJsxClosingElement(waitingTag),
  );

  const properties = [...suspense.openingElement.attributes.properties];
  const fallbackIndex = properties.findIndex((property) =>
    ts.isJsxAttribute(property) && property.name.getText() === "fallback",
  );
  const fallbackContent = fallbackIndex >= 0 && ts.isJsxAttribute(properties[fallbackIndex])
    ? properties[fallbackIndex].initializer
    : undefined;
  const fallbackChild: ts.JsxChild | undefined = fallbackContent && ts.isJsxExpression(fallbackContent) && fallbackContent.expression
    ? factory.createJsxExpression(undefined, fallbackContent.expression)
    : fallbackContent && ts.isStringLiteral(fallbackContent)
      ? factory.createJsxExpression(undefined, fallbackContent)
      : fallbackContent as ts.JsxChild | undefined;
  const wrappedFallback = factory.updateJsxElement(
    fallbackMarker,
    fallbackMarker.openingElement,
    fallbackChild ? [fallbackChild] : [],
    fallbackMarker.closingElement,
  );
  const fallbackAttribute = factory.createJsxAttribute(
    factory.createIdentifier("fallback"),
    factory.createJsxExpression(undefined, wrappedFallback),
  );

  if (fallbackIndex >= 0) properties[fallbackIndex] = fallbackAttribute;
  else properties.push(fallbackAttribute);

  const resolvedMarker = factory.createJsxSelfClosingElement(
    factory.createIdentifier(reporterName),
    undefined,
    statusAttributes("resolved"),
  );
  const opening = factory.updateJsxOpeningElement(
    suspense.openingElement,
    suspense.openingElement.tagName,
    suspense.openingElement.typeArguments,
    factory.updateJsxAttributes(suspense.openingElement.attributes, properties),
  );

  return factory.updateJsxElement(suspense, opening, [resolvedMarker, ...suspense.children], suspense.closingElement);
}

function findFirstComponentName(nodes: readonly ts.Node[], sourceFile: ts.SourceFile): string | undefined {
  for (const node of nodes) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = (ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName).getText(sourceFile);
      if (/^[A-Z]/.test(tagName) || tagName.includes(".")) return tagName;
    }

    const nestedName = findFirstComponentNameFromNode(node, sourceFile);
    if (nestedName) return nestedName;
  }
  return undefined;
}

function findFirstComponentNameFromNode(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
  let componentName: string | undefined;
  const visit = (child: ts.Node) => {
    if (componentName) return;
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
      const tagName = (ts.isJsxElement(child) ? child.openingElement.tagName : child.tagName).getText(sourceFile);
      if (/^[A-Z]/.test(tagName) || tagName.includes(".")) {
        componentName = tagName;
        return;
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return componentName;
}

function visitComponentBody(
  body: ts.Block,
  visitor: ts.Visitor,
  wrap: (expression: ts.Expression) => ts.Expression,
  context: ts.TransformationContext,
) {
  const returnVisitor: ts.Visitor = (node) => {
    if (ts.isFunctionLike(node)) return node;
    if (ts.isReturnStatement(node) && node.expression) {
      const expression = ts.visitNode(node.expression, visitor) as ts.Expression;
      return ts.factory.updateReturnStatement(node, wrap(expression));
    }
    return ts.visitEachChild(node, returnVisitor, context);
  };
  return ts.visitNode(body, returnVisitor) as ts.Block;
}

type ComponentFunction = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;

function isComponentFunction(node: ts.Node): node is ComponentFunction {
  if (ts.isFunctionDeclaration(node)) {
    return Boolean(node.body && (isDefaultExport(node) || (node.name && isComponentName(node.name.text))));
  }
  if (ts.isFunctionExpression(node) && node.name && isComponentName(node.name.text)) return Boolean(node.body);
  if (ts.isArrowFunction(node) || (ts.isFunctionExpression(node) && !node.name)) {
    return Boolean(node.body && isAssignedToComponentBinding(node));
  }
  return false;
}

function isAssignedToComponentBinding(node: ts.ArrowFunction | ts.FunctionExpression) {
  let expression: ts.Expression = node;
  let parent = expression.parent;

  while (parent) {
    if (isTransparentExpression(parent) && parent.expression === expression) {
      expression = parent;
      parent = parent.parent;
      continue;
    }
    if (ts.isCallExpression(parent) && parent.arguments.includes(expression)) {
      expression = parent;
      parent = parent.parent;
      continue;
    }
    if (ts.isVariableDeclaration(parent) && parent.initializer === expression) {
      return ts.isIdentifier(parent.name) && isComponentName(parent.name.text);
    }
    if (ts.isExportAssignment(parent) && !parent.isExportEquals && parent.expression === expression) return true;
    return false;
  }

  return false;
}

function isTransparentExpression(node: ts.Node): node is
  | ts.ParenthesizedExpression
  | ts.AsExpression
  | ts.TypeAssertion
  | ts.SatisfiesExpression
  | ts.NonNullExpression {
  return (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  );
}

function isComponentRenderMethod(node: ts.Node): node is ts.MethodDeclaration {
  return (
    ts.isMethodDeclaration(node) &&
    Boolean(node.body) &&
    ts.isIdentifier(node.name) &&
    node.name.text === "render" &&
    isReactComponentClass(node.parent)
  );
}

function isReactComponentClass(node: ts.Node) {
  if (!ts.isClassLike(node)) return false;
  return node.heritageClauses?.some((clause) =>
    clause.token === ts.SyntaxKind.ExtendsKeyword &&
    clause.types.some((type) => /(?:^|\.)(?:PureComponent|Component)$/.test(type.expression.getText())),
  ) ?? false;
}

function isDefaultExport(node: ts.FunctionDeclaration) {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
}

function isComponentName(name: string) {
  return /^[A-Z]/.test(name);
}

function containsJsx(node: ts.Node): boolean {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return true;
  if (ts.isFunctionLike(node)) return false;
  let found = false;
  ts.forEachChild(node, (child) => {
    if (containsJsx(child)) {
      found = true;
      return true;
    }
    return false;
  });
  return found;
}

function getDirectives(statements: readonly ts.Statement[]) {
  const directives: string[] = [];
  for (const statement of statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    directives.push(statement.expression.text);
  }
  return directives;
}

function getModuleKind(sourceFile: ts.SourceFile, directives: string[]): BoundaryKind {
  if (hasMarkerImport(sourceFile, "server-only")) return "server-only";
  if (hasMarkerImport(sourceFile, "client-only")) return "client-only";
  if (directives.includes("use client")) return "client";
  return "server";
}

function getFunctionKinds(
  node: ComponentFunction | ts.MethodDeclaration,
  moduleKind: BoundaryKind,
  moduleDirectives: string[],
): BoundaryKind[] {
  const directives = node.body && ts.isBlock(node.body) ? getDirectives(node.body.statements) : [];
  const cacheKind: BoundaryKind | undefined =
    directives.includes("use cache: private") || moduleDirectives.includes("use cache: private")
      ? "cache-private"
      : directives.includes("use cache: remote") || moduleDirectives.includes("use cache: remote")
        ? "cache-remote"
        : directives.includes("use cache") || moduleDirectives.includes("use cache")
          ? "cache"
          : undefined;
  if (cacheKind) return ["server", cacheKind];
  return [moduleKind];
}

function getComponentMetadata(
  node: ComponentFunction | ts.MethodDeclaration,
  sourceFile: ts.SourceFile,
  source: string,
): ComponentMetadata {
  const importedHooks = new Map<string, string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings) continue;
    const bindings = statement.importClause.namedBindings;
    if (!ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      const importedName = (element.propertyName ?? element.name).text;
      if (importedName === "useState" || importedName === "useEffect") {
        importedHooks.set(element.name.text, importedName);
      }
    }
  }

  let usesState = false;
  let usesEffect = false;
  let hasTopLevelAwait = false;
  const visitComponentScope = (child: ts.Node) => {
    if (child !== node && ts.isFunctionLike(child)) return;
    if (ts.isCallExpression(child)) {
      const expression = child.expression;
      const hookName = ts.isIdentifier(expression)
        ? importedHooks.get(expression.text) ?? expression.text
        : ts.isPropertyAccessExpression(expression)
          ? expression.name.text
          : "";
      if (hookName === "useState") usesState = true;
      if (hookName === "useEffect") usesEffect = true;
    }
    if (ts.isAwaitExpression(child)) hasTopLevelAwait = true;
    ts.forEachChild(child, visitComponentScope);
  };

  if (node.body) visitComponentScope(node.body);
  const isAsync = node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
  return {
    totalLines: source.split(/\r\n|\r|\n/).length,
    usesState,
    usesEffect,
    isAsync,
    hasTopLevelAwait,
    parameters: node.parameters.map((parameter) => {
      const parameterName = parameter.name.getText(sourceFile);
      const parameterType = parameter.type?.getText(sourceFile) ?? "inferred";
      return `${parameterName}: ${parameterType}`;
    }),
    returnType: getReturnType(node, sourceFile, isAsync),
  };
}

function getReturnType(node: ComponentFunction | ts.MethodDeclaration, sourceFile: ts.SourceFile, isAsync: boolean) {
  if (node.type) return node.type.getText(sourceFile);

  let returnsJsx = false;
  const inspect = (child: ts.Node) => {
    if (child !== node && ts.isFunctionLike(child)) return;
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) returnsJsx = true;
    ts.forEachChild(child, inspect);
  };
  if (node.body) inspect(node.body);
  if (returnsJsx) return isAsync ? "Promise<JSX.Element> (inferred)" : "JSX.Element (inferred)";
  return "Inferred by TypeScript";
}

function findActionMetadata(actionName: string, sourceFile: ts.SourceFile, source: string): ComponentMetadata | undefined {
  const name = actionName.trim();
  if (!/^[\w$]+$/.test(name)) return undefined;

  let actionFunction: ComponentFunction | undefined;
  const visit = (node: ts.Node) => {
    if (actionFunction) return;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name && node.body) {
      actionFunction = node;
      return;
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
      actionFunction = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return actionFunction ? getComponentMetadata(actionFunction, sourceFile, source) : undefined;
}

function hasMarkerImport(sourceFile: ts.SourceFile, marker: string) {
  return sourceFile.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === marker,
  );
}

function containsHtmlRoot(sourceFile: ts.SourceFile) {
  let containsHtml = false;
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(sourceFile) === "html") {
      containsHtml = true;
      return;
    }
    if (!containsHtml) ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return containsHtml;
}

function getActionForm(node: ts.JsxElement, sourceFile: ts.SourceFile) {
  if (node.openingElement.tagName.getText(sourceFile) !== "form") return undefined;
  const action = node.openingElement.attributes.properties.find(
    (attribute): attribute is ts.JsxAttribute =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === "action",
  );
  if (!action || !action.initializer || !ts.isJsxExpression(action.initializer) || !action.initializer.expression) return undefined;
  return action.initializer.expression.getText(sourceFile);
}

function getActionAttributeName(attributes: ts.JsxAttributes, sourceFile: ts.SourceFile) {
  const action = attributes.properties.find(
    (attribute): attribute is ts.JsxAttribute =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === "action",
  );
  if (!action?.initializer || !ts.isJsxExpression(action.initializer) || !action.initializer.expression) return undefined;
  const expression = action.initializer.expression;
  return ts.isIdentifier(expression) ? expression.text : "inlineServerAction";
}

function hasActionAttribute(attributes: ts.JsxAttributes) {
  return attributes.properties.some(
    (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText() === "action" && Boolean(attribute.initializer),
  );
}
