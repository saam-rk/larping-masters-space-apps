/** Tool-only TS/JSON import adapter using the existing TypeScript dependency. Node >=22.15. */
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
const root = new URL('../../', import.meta.url);
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const path = fileURLToPath(new URL(specifier, context.parentURL));
      for (const candidate of [path, path.replace(/\.js$/, '.ts'), `${path}.ts`]) {
        if (existsSync(candidate)) return next(pathToFileURL(candidate).href, context);
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.ts') && !url.includes('/node_modules/')) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText,
    };
    if (url.endsWith('.json') && url.startsWith(root.href)) return { format: 'module', shortCircuit: true, source: `export default ${readFileSync(fileURLToPath(url), 'utf8')};` };
    return next(url, context);
  },
});
