import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import { glob } from 'glob';

describe('Code Quality Tests', () => {
  const srcDir = path.join(__dirname, '..');
  
  describe('File Organization', () => {
    test('should not have excessively large files', async () => {
      const tsFiles = glob.sync('**/*.ts', { cwd: srcDir });
      const excessivelyLargeFiles: string[] = [];
      
      for (const file of tsFiles) {
        const filePath = path.join(srcDir, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf8');
          const lineCount = content.split('\n').length;
          
          if (lineCount > 500) {
            excessivelyLargeFiles.push(`${file} (${lineCount} lines)`);
          }
        }
      }
      
      if (excessivelyLargeFiles.length > 0) {
        console.warn('Large files detected:', excessivelyLargeFiles);
      }
      
      // 警告レベルのテスト（必須ではない）
      expect(excessivelyLargeFiles.length).toBeLessThan(10);
    });
    
    test('should have proper directory structure', () => {
      const expectedDirectories = [
        'routes',
        'services',
        'middleware',
        'utils',
        'config',
        'database',
        'tests'
      ];
      
      for (const dir of expectedDirectories) {
        const dirPath = path.join(srcDir, dir);
        expect(existsSync(dirPath)).toBe(true);
      }
    });
  });
  
  describe('Code Standards', () => {
    test('should not have console.log in production code', () => {
      const tsFiles = glob.sync('**/*.ts', { 
        cwd: srcDir,
        ignore: ['**/*.test.ts', '**/*.spec.ts']
      });
      
      const filesWithConsoleLog: string[] = [];
      
      for (const file of tsFiles) {
        const filePath = path.join(srcDir, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf8');
          
          // console.log の検出（コメント内は除外）
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.includes('console.log') && !line.trim().startsWith('//')) {
              filesWithConsoleLog.push(`${file}:${index + 1}`);
            }
          });
        }
      }
      
      if (filesWithConsoleLog.length > 0) {
        console.warn('Console.log found in:', filesWithConsoleLog);
      }
      
      expect(filesWithConsoleLog.length).toBe(0);
    });
    
    test('should not have TODO comments in production code', () => {
      const tsFiles = glob.sync('**/*.ts', { 
        cwd: srcDir,
        ignore: ['**/*.test.ts', '**/*.spec.ts']
      });
      
      const filesWithTodos: string[] = [];
      
      for (const file of tsFiles) {
        const filePath = path.join(srcDir, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf8');
          
          const todoPattern = /\b(TODO|FIXME|XXX|HACK)\b/i;
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (todoPattern.test(line)) {
              filesWithTodos.push(`${file}:${index + 1} - ${line.trim()}`);
            }
          });
        }
      }
      
      if (filesWithTodos.length > 0) {
        console.warn('TODO comments found:', filesWithTodos);
      }
      
      // 警告レベルのテスト（少数のTODOは許可）
      expect(filesWithTodos.length).toBeLessThan(5);
    });
    
    test('should have proper TypeScript types', () => {
      const tsFiles = glob.sync('**/*.ts', { 
        cwd: srcDir,
        ignore: ['**/*.test.ts', '**/*.spec.ts']
      });
      
      const filesWithAny: string[] = [];
      
      for (const file of tsFiles) {
        const filePath = path.join(srcDir, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf8');
          
          // : any の検出
          const anyPattern = /:\s*any\b/g;
          const matches = content.match(anyPattern);
          if (matches && matches.length > 0) {
            filesWithAny.push(`${file} (${matches.length} occurrences)`);
          }
        }
      }
      
      if (filesWithAny.length > 0) {
        console.warn('Files with "any" type:', filesWithAny);
      }
      
      // 警告レベルのテスト（一部のanyは許可）
      expect(filesWithAny.length).toBeLessThan(10);
    });
  });
  
  describe('Security Code Quality', () => {
    test('should not have hardcoded secrets', () => {
      const tsFiles = glob.sync('**/*.ts', { 
        cwd: srcDir,
        ignore: ['**/*.test.ts', '**/*.spec.ts']
      });
      
      const suspiciousFiles: string[] = [];
      const secretPatterns = [
        /AIza[0-9A-Za-z-_]{35}/, // Google API Key
        /sk-[0-9A-Za-z]{48}/, // OpenAI API Key
        /sk-ant-[0-9A-Za-z-_]{95}/, // Anthropic API Key
        /password\s*=\s*["'][^"']+["']/i,
        /secret\s*=\s*["'][^"']+["']/i,
        /token\s*=\s*["'][^"']+["']/i,
      ];
      
      for (const file of tsFiles) {
        const filePath = path.join(srcDir, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf8');
          
          for (const pattern of secretPatterns) {
            if (pattern.test(content)) {
              suspiciousFiles.push(`${file} - potential secret detected`);
            }
          }
        }
      }
      
      expect(suspiciousFiles.length).toBe(0);
    });
    
    test('should have proper error handling', () => {
      const tsFiles = glob.sync('**/*.ts', { 
        cwd: srcDir,
        ignore: ['**/*.test.ts', '**/*.spec.ts']
      });
      
      const filesWithoutErrorHandling: string[] = [];
      
      for (const file of tsFiles) {
        const filePath = path.join(srcDir, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf8');
          
          // async function があるのに try-catch がない場合を検出
          const hasAsyncFunction = /async\s+function|async\s+\w+\s*\(|async\s*\(/g.test(content);
          const hasTryCatch = /try\s*\{|catch\s*\(/.test(content);
          
          if (hasAsyncFunction && !hasTryCatch && !file.includes('config')) {
            filesWithoutErrorHandling.push(file);
          }
        }
      }
      
      if (filesWithoutErrorHandling.length > 0) {
        console.warn('Files with async functions but no error handling:', filesWithoutErrorHandling);
      }
      
      // 警告レベルのテスト（一部のファイルは許可）
      expect(filesWithoutErrorHandling.length).toBeLessThan(15);
    });
  });
  
  describe('Performance Code Quality', () => {
    test('should not have memory leaks indicators', () => {
      const tsFiles = glob.sync('**/*.ts', { 
        cwd: srcDir,
        ignore: ['**/*.test.ts', '**/*.spec.ts']
      });
      
      const memoryLeakIndicators: string[] = [];
      
      for (const file of tsFiles) {
        const filePath = path.join(srcDir, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf8');
          
          // setInterval without clearInterval
          const hasSetInterval = /setInterval\s*\(/.test(content);
          const hasClearInterval = /clearInterval\s*\(/.test(content);
          
          if (hasSetInterval && !hasClearInterval) {
            memoryLeakIndicators.push(`${file} - setInterval without clearInterval`);
          }
          
          // setTimeout without clearTimeout (in certain contexts)
          const hasSetTimeout = /setTimeout\s*\(/.test(content);
          const hasClearTimeout = /clearTimeout\s*\(/.test(content);
          
          if (hasSetTimeout && !hasClearTimeout && content.includes('useState')) {
            memoryLeakIndicators.push(`${file} - setTimeout in component without clearTimeout`);
          }
        }
      }
      
      if (memoryLeakIndicators.length > 0) {
        console.warn('Potential memory leak indicators:', memoryLeakIndicators);
      }
      
      // 警告レベルのテスト
      expect(memoryLeakIndicators.length).toBeLessThan(5);
    });
  });
  
  describe('Dependencies Quality', () => {
    test('should have proper imports', () => {
      const tsFiles = glob.sync('**/*.ts', { 
        cwd: srcDir,
        ignore: ['**/*.test.ts', '**/*.spec.ts']
      });
      
      const badImports: string[] = [];
      
      for (const file of tsFiles) {
        const filePath = path.join(srcDir, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf8');
          
          // 相対パス問題の検出
          const deepRelativeImports = /import.*from\s+["']\.\.\/\.\.\/\.\.\//g;
          if (deepRelativeImports.test(content)) {
            badImports.push(`${file} - deep relative imports detected`);
          }
          
          // 循環インポートの可能性
          const selfImport = new RegExp(`import.*from\\s+["'].*${file.replace('.ts', '')}["']`);
          if (selfImport.test(content)) {
            badImports.push(`${file} - potential circular import`);
          }
        }
      }
      
      if (badImports.length > 0) {
        console.warn('Import issues found:', badImports);
      }
      
      expect(badImports.length).toBeLessThan(5);
    });
  });
});

describe('Database Code Quality', () => {
  test('should have proper database connection handling', () => {
    const dbFiles = glob.sync('**/database/**/*.ts', { cwd: path.join(__dirname, '..') });
    
    for (const file of dbFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        
        // データベース接続のクリーンアップ
        if (content.includes('sqlite3') || content.includes('better-sqlite3')) {
          expect(content).toMatch(/\.close\(\)|\.end\(\)/);
        }
      }
    }
  });
});

describe('Configuration Code Quality', () => {
  test('should have proper environment variable validation', () => {
    const configFiles = glob.sync('**/config/**/*.ts', { cwd: path.join(__dirname, '..') });
    
    for (const file of configFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        
        // 環境変数の検証
        if (content.includes('process.env')) {
          // 直接的な process.env アクセスではなく、検証機能があることを確認
          expect(content).toMatch(/validateEnv|validateOptionalEnv|config\./);
        }
      }
    }
  });
});