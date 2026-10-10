const path = require("node:path");
const ts = require("typescript");
const { transformBoundaries } = require("../dist/next/transformer.js");

module.exports = function boundaryLoader(source, inputSourceMap) {
  const callback = this.async();

  try {
    const filePath = this.resourcePath;
    if (filePath.includes(`${path.sep}node_modules${path.sep}`) || filePath.includes(`${path.sep}.next${path.sep}`)) {
      callback(null, source, inputSourceMap);
      return;
    }

    const transformedSource = transformBoundaries(source.toString(), filePath);
    const sourceFile = ts.createSourceFile(filePath, transformedSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const directives = [];
    let directiveEnd = 0;
    for (const statement of sourceFile.statements) {
      if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
      directives.push(statement.expression.text);
      directiveEnd = statement.end;
    }

    const sourceWithoutDirectives = transformedSource.slice(directiveEnd);
    const result = ts.transpileModule(sourceWithoutDirectives, {
      fileName: filePath,
      compilerOptions: {
        allowJs: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        sourceMap: true,
        target: ts.ScriptTarget.ESNext,
      },
      reportDiagnostics: true,
    });

    const error = result.diagnostics?.find((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    if (error) {
      callback(new Error(ts.flattenDiagnosticMessageText(error.messageText, "\n")));
      return;
    }

    const preservedDirectives = directives.map((directive) => `${JSON.stringify(directive)};`).join("\n");
    const outputText = preservedDirectives ? `${preservedDirectives}\n${result.outputText}` : result.outputText;

    callback(
      null,
      outputText,
      result.sourceMapText ? JSON.parse(result.sourceMapText) : inputSourceMap,
    );
  } catch (error) {
    callback(error);
  }
};
