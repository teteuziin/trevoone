import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers") {
    return nextResolve("next/headers.js", context);
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
            return nextResolve(pathToFileURL(candidate).href, context);
          }
        }
      }
    }
    throw err;
  }
}
