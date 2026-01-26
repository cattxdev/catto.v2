import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import fg from 'fast-glob';

/**
 * Adds .js extensions to relative imports in TypeScript files for ESM compatibility.
 * Also corrects paths that should point to index.js files.
 *
 * Usage:
 *   tsx scripts/fix-imports.ts                    # Fix all files in src/
 *   tsx scripts/fix-imports.ts src/index.ts       # Fix specific file(s)
 *   tsx scripts/fix-imports.ts "src/lib/*.ts"     # Fix files matching pattern
 *
 * Designed to work with lint-staged (receives file list as arguments).
 * Requires Node.js 20+ and fast-glob package.
 */

interface FixResult {
  file: string;
  fixed: number;
  imports: string[];
}

async function getFilesToProcess(): Promise<string[]> {
  const args = process.argv.slice(2);

  // If arguments provided (e.g., from lint-staged), use those
  if (args.length > 0) {
    const files: string[] = [];

    for (const arg of args) {
      // Check if it's a glob pattern
      if (arg.includes('*')) {
        const matches = await fg(arg, { absolute: true, onlyFiles: true });
        files.push(...matches.filter((f) => f.endsWith('.ts')));
      } else if (arg.endsWith('.ts')) {
        const resolved = resolve(arg);
        if (existsSync(resolved)) {
          files.push(resolved);
        }
      }
    }

    return files;
  }

  // No arguments - scan all TypeScript files in src/
  return fg('src/**/*.ts', { absolute: true, onlyFiles: true });
}

function resolveImportPath(
  importPath: string,
  currentFile: string,
  projectRoot: string
): string | null {
  // Remove .js extension if present to check the correct path
  const pathWithoutExt = importPath.endsWith('.js') ? importPath.slice(0, -3) : importPath;

  if (pathWithoutExt.startsWith('.')) {
    // Relative import
    return resolve(dirname(currentFile), pathWithoutExt);
  }

  if (pathWithoutExt.startsWith('#')) {
    // Path alias - map to source directory
    const aliasMap: Record<string, string> = {
      '#lib/': 'src/lib/',
      '#root/': 'src/',
      '#structures/': 'src/structures/',
      '#commands/': 'src/commands/',
      '#listeners/': 'src/listeners/',
      '#routes/': 'src/routes/',
      '#preconditions/': 'src/preconditions/',
      '#modules/': 'src/modules/',
      '#config': 'src/config',
    };

    for (const [alias, replacement] of Object.entries(aliasMap)) {
      if (pathWithoutExt.startsWith(alias) || pathWithoutExt === alias.slice(0, -1)) {
        const aliasPath = pathWithoutExt.replace(alias, replacement);
        return resolve(projectRoot, aliasPath);
      }
    }
  }

  return null;
}

function determineCorrectPath(originalPath: string, resolvedPath: string | null): string {
  const pathWithoutExt = originalPath.endsWith('.js') ? originalPath.slice(0, -3) : originalPath;

  if (!resolvedPath) {
    // Couldn't resolve - if it doesn't have .js, add it
    return originalPath.endsWith('.js') ? originalPath : `${pathWithoutExt}.js`;
  }

  const tsFile = `${resolvedPath}.ts`;
  const tsxFile = `${resolvedPath}.tsx`;
  const dirWithIndex = join(resolvedPath, 'index.ts');

  if (existsSync(dirWithIndex)) {
    // It's a directory with index.ts, should end with /index.js
    return `${pathWithoutExt}/index.js`;
  }

  if (existsSync(tsFile) || existsSync(tsxFile)) {
    // It's a file, should end with .js
    return `${pathWithoutExt}.js`;
  }

  // Can't resolve - if it doesn't have .js, add it
  return originalPath.endsWith('.js') ? originalPath : `${pathWithoutExt}.js`;
}

function processFile(file: string, projectRoot: string): FixResult {
  let content = readFileSync(file, 'utf-8');
  const result: FixResult = {
    file: file.replace(projectRoot, '').replace(/\\/g, '/').replace(/^\//, ''),
    fixed: 0,
    imports: [],
  };

  let modified = false;

  // Patterns to match (with 's' flag for multiline):
  // 1. Static: import/export ... from 'path' (can span multiple lines)
  // 2. Dynamic: import('path') or await import('path')
  const patterns = [
    /((?:import|export)\s+[\s\S]*?from\s*['"])([^'"]+)(['"])/g, // Static imports (multiline)
    /((?:await\s+)?import\s*\(\s*['"])([^'"]+)(['"]\s*\))/g, // Dynamic imports
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const [fullMatch, before, originalPath, after] = match as [string, string, string, string];

      // Skip node_modules imports
      if (!originalPath.startsWith('.') && !originalPath.startsWith('#')) {
        continue;
      }

      // Skip directory imports ending with /
      if (originalPath.endsWith('/') || originalPath.endsWith('\\')) {
        continue;
      }

      const resolvedPath = resolveImportPath(originalPath, file, projectRoot);
      const correctPath = determineCorrectPath(originalPath, resolvedPath);

      if (correctPath !== originalPath) {
        content = content.replace(fullMatch, `${before}${correctPath}${after}`);
        result.fixed++;
        result.imports.push(`${originalPath} → ${correctPath}`);
        modified = true;
        // Reset pattern to re-scan from beginning after replacement
        pattern.lastIndex = 0;
      }
    }
  }

  if (modified) {
    writeFileSync(file, content, 'utf-8');
  }

  return result;
}

async function main() {
  const projectRoot = process.cwd();
  const files = await getFilesToProcess();

  if (files.length === 0) {
    console.log('No TypeScript files to process');
    return;
  }

  const results: FixResult[] = [];
  let totalFixed = 0;

  for (const file of files) {
    const result = processFile(file, projectRoot);
    if (result.fixed > 0) {
      results.push(result);
      totalFixed += result.fixed;
    }
  }

  // Output summary
  if (results.length > 0) {
    console.log(`\nFixed ${totalFixed} imports in ${results.length} files:\n`);
    for (const result of results) {
      console.log(`  ${result.file} (${result.fixed} imports)`);
      for (const imp of result.imports) {
        console.log(`    ${imp}`);
      }
    }
    console.log('');
  } else {
    console.log(`Checked ${files.length} files - all imports are correct`);
  }
}

main().catch((error) => {
  console.error('Error fixing imports:', error);
  process.exit(1);
});
