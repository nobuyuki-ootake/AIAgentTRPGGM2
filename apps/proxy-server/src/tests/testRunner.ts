/**
 * Test Runner - Utility to run specific test suites
 * Demonstrates proper test environment setup and execution
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

interface TestConfig {
  testFile?: string;
  testType?: 'unit' | 'integration' | 'all';
  coverage?: boolean;
  watch?: boolean;
  verbose?: boolean;
}

/**
 * Test Runner Class
 */
export class TestRunner {
  private projectRoot: string;
  
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
  }

  /**
   * Run tests with specified configuration
   */
  async runTests(config: TestConfig = {}): Promise<void> {
    const {
      testFile,
      testType = 'all',
      coverage = false,
      watch = false,
      verbose = false
    } = config;

    // Build Jest command
    let command = 'npm run test';
    
    if (testType === 'unit') {
      command = 'npm run test:unit';
    } else if (testType === 'integration') {
      command = 'npm run test:integration';
    } else if (coverage) {
      command = 'npm run test:coverage';
    } else if (watch) {
      command = 'npm run test:watch';
    }

    // Add specific test file if provided
    if (testFile) {
      if (!existsSync(path.join(this.projectRoot, 'src', testFile))) {
        throw new Error(`Test file not found: ${testFile}`);
      }
      command += ` -- ${testFile}`;
    }

    // Add verbose flag
    if (verbose) {
      command += ' -- --verbose';
    }

    console.log(`🧪 Running tests with command: ${command}`);
    console.log(`📁 Project root: ${this.projectRoot}`);
    console.log('');

    try {
      // Execute tests
      execSync(command, {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      
      console.log('\n✅ Tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Tests failed!');
      throw error;
    }
  }

  /**
   * Run sample tests to verify setup
   */
  async runSampleTests(): Promise<void> {
    console.log('🎯 Running sample tests to verify Jest setup...\n');
    
    await this.runTests({
      testFile: 'tests/sample.unit.test.ts',
      verbose: true
    });
  }

  /**
   * Run all unit tests
   */
  async runUnitTests(): Promise<void> {
    console.log('🧪 Running all unit tests...\n');
    
    await this.runTests({
      testType: 'unit',
      coverage: true
    });
  }

  /**
   * Run all integration tests
   */
  async runIntegrationTests(): Promise<void> {
    console.log('🔗 Running all integration tests...\n');
    
    await this.runTests({
      testType: 'integration',
      coverage: true
    });
  }

  /**
   * Run tests in watch mode for development
   */
  async runWatchMode(): Promise<void> {
    console.log('👀 Running tests in watch mode...\n');
    
    await this.runTests({
      watch: true
    });
  }

  /**
   * Generate coverage report
   */
  async generateCoverage(): Promise<void> {
    console.log('📊 Generating test coverage report...\n');
    
    await this.runTests({
      coverage: true
    });
    
    console.log('\n📈 Coverage report generated in coverage/ directory');
  }

  /**
   * Check if Jest setup is working correctly
   */
  async verifySetup(): Promise<boolean> {
    try {
      console.log('🔍 Verifying Jest setup...\n');
      
      // Check if jest config exists
      const jestConfigPath = path.join(this.projectRoot, 'jest.config.ts');
      if (!existsSync(jestConfigPath)) {
        console.error('❌ jest.config.ts not found');
        return false;
      }
      console.log('✅ jest.config.ts found');

      // Check if setup files exist
      const setupPath = path.join(this.projectRoot, 'src/tests/setup/jest.setup.ts');
      if (!existsSync(setupPath)) {
        console.error('❌ jest.setup.ts not found');
        return false;
      }
      console.log('✅ jest.setup.ts found');

      // Run a simple test to verify everything works
      execSync('npm run test:sample', {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      console.log('✅ Sample test executed successfully');

      console.log('\n🎉 Jest setup verification complete!');
      return true;
    } catch (error) {
      console.error('\n❌ Jest setup verification failed:', error);
      return false;
    }
  }
}

/**
 * CLI Interface for running tests
 */
if (require.main === module) {
  const runner = new TestRunner();
  const args = process.argv.slice(2);
  
  async function main() {
    try {
      if (args.includes('--verify')) {
        await runner.verifySetup();
      } else if (args.includes('--sample')) {
        await runner.runSampleTests();
      } else if (args.includes('--unit')) {
        await runner.runUnitTests();
      } else if (args.includes('--integration')) {
        await runner.runIntegrationTests();
      } else if (args.includes('--watch')) {
        await runner.runWatchMode();
      } else if (args.includes('--coverage')) {
        await runner.generateCoverage();
      } else {
        console.log(`
📝 Test Runner Usage:

  npm run test                    # Run all tests
  ts-node src/tests/testRunner.ts [options]

Options:
  --verify      Verify Jest setup is working
  --sample      Run sample tests only
  --unit        Run unit tests with coverage
  --integration Run integration tests with coverage
  --watch       Run tests in watch mode
  --coverage    Generate coverage report

Examples:
  ts-node src/tests/testRunner.ts --verify
  ts-node src/tests/testRunner.ts --sample
  ts-node src/tests/testRunner.ts --unit
        `);
      }
    } catch (error) {
      console.error('Test runner failed:', error);
      process.exit(1);
    }
  }
  
  main();
}

export { TestRunner };