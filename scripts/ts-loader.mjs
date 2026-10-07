import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {

    if (specifier.startsWith('next/')) {
      const full = path.resolve(process.cwd(), 'node_modules', specifier + '.js');
      if (fs.existsSync(full)) {
        return {
          url: pathToFileURL(full).href,
          shortCircuit: true,
        };
      }
    }

    if (specifier.startsWith('@/')) {
      const sub = specifier.slice(2);
      const basePath = path.resolve(process.cwd(), sub);
      for (const ext of ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx', '/index.js']) {
        const full = basePath + ext;
        if (fs.existsSync(full) && !fs.statSync(full).isDirectory()) {
          return {
            url: pathToFileURL(full).href,
            shortCircuit: true,
          };
        }
      }
    }

    if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('file://') || /^[a-zA-Z]:[\\/]/.test(specifier)) {
      let parentDir = process.cwd();
      if (context.parentURL) {
        try {
          parentDir = path.dirname(fileURLToPath(context.parentURL));
        } catch {}
      }
      const basePath = /^[a-zA-Z]:[\\/]/.test(specifier) ? path.resolve(specifier) : path.resolve(parentDir, specifier);
      for (const ext of ['.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx', '/index.js']) {
        const full = basePath + ext;
        if (fs.existsSync(full) && !fs.statSync(full).isDirectory()) {
          return {
            format: 'module',
            url: pathToFileURL(full).href,
            shortCircuit: true,
          };
        }
      }
    }

    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.tsx') || url.endsWith('.ts')) {
    const { default: ts } = await import('typescript');
    const filePath = decodeURIComponent(new URL(url).pathname.replace(/^\/([A-Z]:)/, '$1'));
    const source = fs.readFileSync(filePath, 'utf8');
    const result = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React,
      },
    });
    return {
      format: 'module',
      shortCircuit: true,
      source: result.outputText,
    };
  }
  return nextLoad(url, context);
}
