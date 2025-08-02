// Derived from Outline's list.action.mjs (Jigsaw-Code/outline-apps)
// Licensed under the Apache License, Version 2.0.
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { globby } from 'globby';

function getRootDir() {
  return path.dirname(url.fileURLToPath(import.meta.url));
}

export async function main() {
  const pkg = JSON.parse(
    await fs.readFile(path.join(getRootDir(), '..', 'package.json'))
  );
  for (const script in pkg.scripts) {
    console.info(script);
  }
  const actionFiles = await globby(['**/*.action.sh', '**/*.action.mjs'], {
    cwd: getRootDir(),
    gitignore: true,
  });
  for (const actionPath of actionFiles) {
    const match = actionPath.match(/(.+)\.action/);
    if (match && !actionPath.includes('node_modules')) {
      console.info(match[1]);
    }
  }
}

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  main();
}
