import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const apps = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
function parse(file: string) {
  return ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
}
function moduleLists(source: ts.SourceFile) {
  const lists = new Map<string, string[]>();
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "Module") {
      const metadata = node.arguments[0];
      if (metadata && ts.isObjectLiteralExpression(metadata)) {
        for (const property of metadata.properties) {
          if (ts.isPropertyAssignment(property) && ts.isArrayLiteralExpression(property.initializer)) {
            lists.set(property.name.getText(source), property.initializer.elements.map((item) => item.getText(source)));
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return lists;
}
for (const app of ["gateway", "control"]) {
  test(`${app} controller dispatcher injection has a local or imported provider`, () => {
    const root = resolve(apps, app, "src");
    let checked = 0;
    for (const relative of readdirSync(root, { recursive: true }).map(String).filter((file) => file.endsWith(".module.ts"))) {
      const file = resolve(root, relative);
      const source = parse(file);
      const imports = new Map<string, string>();
      for (const statement of source.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const bindings = statement.importClause?.namedBindings;
        if (!bindings || !ts.isNamedImports(bindings) || !statement.moduleSpecifier.text.startsWith(".")) continue;
        for (const binding of bindings.elements) imports.set(binding.name.text,
          resolve(dirname(file), statement.moduleSpecifier.text.replace(/\.js$/, ".ts")));
      }
      const lists = moduleLists(source);
      for (const controller of lists.get("controllers") || []) {
        const controllerFile = imports.get(controller);
        assert.ok(controllerFile, `${file}: resolve controller ${controller}`);
        const controllerSource = parse(controllerFile);
        let needsDispatcher = false;
        function inspect(node: ts.Node) {
          if (ts.isConstructorDeclaration(node) && node.parameters.some((parameter) =>
            parameter.type?.getText(controllerSource) === "WebRouteDispatcher")) needsDispatcher = true;
          ts.forEachChild(node, inspect);
        }
        inspect(controllerSource);
        if (!needsDispatcher) continue;
        checked++;
        if (lists.get("providers")?.includes("WebRouteDispatcher")) {
          assert.equal(imports.get("WebRouteDispatcher"), resolve(root, "common/web-route.dispatcher.ts"));
          continue;
        }
        assert.ok(lists.get("imports")?.includes("CommonModule"), `${file}: ${controller} injects WebRouteDispatcher but CommonModule is absent`);
        assert.equal(imports.get("CommonModule"), resolve(root, "common/common.module.ts"));
      }
    }
    assert.ok(checked > 0, "dispatcher controller coverage must not be empty");
  });
}
