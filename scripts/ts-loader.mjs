import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers") {
    return nextResolve("next/headers.js", context);
  }
  if (specifier === "next/cache") {
    return nextResolve("next/cache.js", context);
  }
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    for (const ext of [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.js"]) {
      const candidate = path.resolve(process.cwd(), rel + ext);
      if (fs.existsSync(candidate)) {
        return {
          url: pathToFileURL(candidate).href,
          shortCircuit: true,
        };
      }
    }
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === "ERR_MODULE_NOT_FOUND") {
      if (specifier.startsWith(".") || specifier.startsWith("/")) {
        const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
        for (const ext of [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.js"]) {
          const candidate = path.resolve(parentDir, specifier + ext);
          if (fs.existsSync(candidate)) {
            return {
              url: pathToFileURL(candidate).href,
              shortCircuit: true,
            };
          }
        }
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".tsx")) {
    const { default: ts } = await import("typescript");
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React,
      },
      fileName: filePath,
    });
    return {
      format: "module",
      source: transpiled.outputText,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
