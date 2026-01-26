import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import fg from 'fast-glob';

/**
 * Checks that all local imports in TypeScript files have .js extensions for ESM compatibility.
 * Also validates that imports pointing to directories use /index.js.
 *
 * Usage:
 *   tsx scripts/check-imports.ts                    # Check all files in src/
 *   tsx scripts/check-imports.ts src/index.ts       # Check specific file(s)
 *   tsx scripts/check-imports.ts src/lib/*.ts       # Check files matching pattern
 *
 * Exit codes:
 *   0 - All imports are valid
 *   1 - Found invalid imports (missing .js extension or incorrect path)
 */

interface ImportError {
  file: string;
  line: number;
  column: number;
  importPath: string;
  suggestion: string;
  reason: string;
}

async function getFilesToProcess(): Promise<string[]> {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    const files: string[] = [];

    for (const arg of args) {
      if (arg.includes('*')) {
        const matched = await fg(arg, { absolute: true, onlyFiles: true });
        files.push(...matched.filter((f) => f.endsWith('.ts')));
      } else if (arg.endsWith('.ts')) {
        const resolved = resolve(arg);
        if (existsSync(resolved)) {
          files.push(resolved);
        }
      }
    }

    return files;
  }

  return fg('src/**/*.ts', { absolute: true, onlyFiles: true });
}

function resolveImportPath(
  importPath: string,
  currentFile: string,
  projectRoot: string
): string | null {
  const pathWithoutExt = importPath.endsWith('.js') ? importPath.slice(0, -3) : importPath;

  if (pathWithoutExt.startsWith('.')) {
    return resolve(dirname(currentFile), pathWithoutExt);
  }

  if (pathWithoutExt.startsWith('#')) {
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

function validateImport(
  importPath: string,
  resolvedPath: string | null,
  file: string,
  line: number,
  column: number,
  projectRoot: string
): ImportError | null {
  const relativeFile = file.replace(projectRoot, '').replace(/\\/g, '/').replace(/^\//, '');

  // Must have .js extension
  if (!importPath.endsWith('.js')) {
    const pathWithoutExt = importPath;
    let suggestion = `${pathWithoutExt}.js`;

    // Check if it should be /index.js
    if (resolvedPath) {
      const dirWithIndex = join(resolvedPath, 'index.ts');
      if (existsSync(dirWithIndex)) {
        suggestion = `${pathWithoutExt}/index.js`;
      }
    }

    return {
      file: relativeFile,
      line,
      column,
      importPath,
      suggestion,
      reason: 'Missing .js extension',
    };
  }

  // Has .js extension - check if it should be /index.js
  if (resolvedPath) {
    const pathWithoutJs = importPath.slice(0, -3);
    const dirWithIndex = join(resolvedPath, 'index.ts');
    const directFile = `${resolvedPath}.ts`;

    // If directory with index.ts exists but we're not importing /index.js
    if (existsSync(dirWithIndex) && !importPath.endsWith('/index.js') && !existsSync(directFile)) {
      return {
        file: relativeFile,
        line,
        column,
        importPath,
        suggestion: `${pathWithoutJs}/index.js`,
        reason: 'Should import /index.js for directory with index.ts',
      };
    }
  }

  return null;
}

function checkFile(file: string, projectRoot: string): ImportError[] {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const errors: ImportError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Match import/export with from clause, capturing column position
    const regex = /((?:import|export).*from\s+['"])([^'"]+)(['"])/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const importPath = match[2]!;
      const column = match.index + match[1]!.length + 1;

      // Skip node_modules imports
      if (!importPath.startsWith('.') && !importPath.startsWith('#')) {
        continue;
      }

      // Skip directory imports ending with /
      if (importPath.endsWith('/') || importPath.endsWith('\\')) {
        continue;
      }

      const resolvedPath = resolveImportPath(importPath, file, projectRoot);
      const error = validateImport(importPath, resolvedPath, file, i + 1, column, projectRoot);

      if (error) {
        errors.push(error);
      }
    }
  }

  return errors;
}

async function main() {
  const projectRoot = process.cwd();
  const files = await getFilesToProcess();

  if (files.length === 0) {
    console.log('No TypeScript files to check');
    return;
  }

  const allErrors: ImportError[] = [];

  for (const file of files) {
    const errors = checkFile(file, projectRoot);
    allErrors.push(...errors);
  }

  if (allErrors.length > 0) {
    console.error(`\nFound ${allErrors.length} import issues:\n`);

    // Group errors by file for cleaner output
    const errorsByFile = new Map<string, ImportError[]>();
    for (const error of allErrors) {
      const existing = errorsByFile.get(error.file) || [];
      existing.push(error);
      errorsByFile.set(error.file, existing);
    }

    for (const [file, errors] of errorsByFile) {
      console.error(`  ${file}`);
      for (const error of errors) {
        console.error(`    Line ${error.line}: '${error.importPath}'`);
        console.error(`      ${error.reason}`);
        console.error(`      Suggestion: '${error.suggestion}'`);
      }
      console.error('');
    }

    console.error(`Run 'pnpm fix:imports' to automatically fix these issues\n`);
    process.exit(1);
  }

  console.log(`Checked ${files.length} files - all imports are valid`);
}

main().catch((error) => {
  console.error('Error checking imports:', error);
  process.exit(1);
});
