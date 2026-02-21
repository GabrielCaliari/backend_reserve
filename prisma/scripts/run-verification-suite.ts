/**
 * Automated UUID Migration Verification Suite
 * 
 * This script runs all verification checks and generates a comprehensive report.
 * 
 * Usage: pnpm exec ts-node prisma/scripts/run-verification-suite.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  name: string;
  passed: boolean;
  duration: number;
  output?: string;
  error?: string;
}

const results: VerificationResult[] = [];

async function runSQLVerification(): Promise<VerificationResult> {
  const startTime = Date.now();
  const name = 'SQL Verification Script';
  
  try {
    console.log(`\n🔍 Running ${name}...`);
    
    const sqlFile = path.join(__dirname, '..', 'migrations', 'verify-uuid-migration.sql');
    
    if (!fs.existsSync(sqlFile)) {
      throw new Error(`SQL verification file not found: ${sqlFile}`);
    }
    
    // Note: This requires psql to be installed and DATABASE_URL to be set
    const output = execSync(
      `psql "${process.env.DATABASE_URL}" -f "${sqlFile}"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${name} completed in ${duration}ms`);
    
    return {
      name,
      passed: true,
      duration,
      output: output.substring(0, 1000) // Truncate for report
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${name} failed in ${duration}ms`);
    
    return {
      name,
      passed: false,
      duration,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function runTypeScriptVerification(): Promise<VerificationResult> {
  const startTime = Date.now();
  const name = 'TypeScript Verification Script';
  
  try {
    console.log(`\n🔍 Running ${name}...`);
    
    const tsFile = path.join(__dirname, 'verify-uuid-migration.ts');
    
    if (!fs.existsSync(tsFile)) {
      throw new Error(`TypeScript verification file not found: ${tsFile}`);
    }
    
    const output = execSync(
      `ts-node "${tsFile}"`,
      { encoding: 'utf-8', stdio: 'pipe', cwd: path.join(__dirname, '..', '..') }
    );
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${name} completed in ${duration}ms`);
    
    return {
      name,
      passed: true,
      duration,
      output: output.substring(0, 1000)
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Check if it's a verification failure (exit code 1) vs actual error
    const errorOutput = error instanceof Error && 'stdout' in error 
      ? (error as any).stdout?.toString() 
      : '';
    
    const isVerificationFailure = errorOutput.includes('SOME CHECKS FAILED');
    
    if (isVerificationFailure) {
      console.log(`⚠️  ${name} found integrity issues in ${duration}ms`);
      return {
        name,
        passed: false,
        duration,
        output: errorOutput.substring(0, 1000)
      };
    }
    
    console.log(`❌ ${name} failed in ${duration}ms`);
    return {
      name,
      passed: false,
      duration,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function generateReport(): void {
  const reportPath = path.join(__dirname, '..', 'verification-report.txt');
  const timestamp = new Date().toISOString();
  
  let report = '';
  report += '='.repeat(80) + '\n';
  report += 'UUID MIGRATION VERIFICATION SUITE REPORT\n';
  report += '='.repeat(80) + '\n';
  report += `Generated: ${timestamp}\n\n`;
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  report += `Total Checks: ${results.length}\n`;
  report += `Passed: ${passed} ✓\n`;
  report += `Failed: ${failed} ✗\n`;
  report += `Total Duration: ${totalDuration}ms\n\n`;
  
  report += '-'.repeat(80) + '\n';
  report += 'DETAILED RESULTS:\n';
  report += '-'.repeat(80) + '\n\n';
  
  results.forEach(result => {
    report += `${result.passed ? '✅' : '❌'} ${result.name}\n`;
    report += `   Duration: ${result.duration}ms\n`;
    
    if (result.output) {
      report += `   Output:\n`;
      report += result.output.split('\n').map(line => `      ${line}`).join('\n') + '\n';
    }
    
    if (result.error) {
      report += `   Error:\n`;
      report += result.error.split('\n').map(line => `      ${line}`).join('\n') + '\n';
    }
    
    report += '\n';
  });
  
  report += '='.repeat(80) + '\n';
  
  if (failed === 0) {
    report += '✅ ALL VERIFICATIONS PASSED\n';
  } else {
    report += '❌ SOME VERIFICATIONS FAILED - REVIEW REQUIRED\n';
  }
  
  report += '='.repeat(80) + '\n';
  
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

async function main() {
  console.log('='.repeat(80));
  console.log('UUID MIGRATION VERIFICATION SUITE');
  console.log('='.repeat(80));
  console.log('\nThis suite will run all verification checks and generate a report.\n');
  
  // Check environment
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  try {
    // Run SQL verification (optional - requires psql)
    try {
      const sqlResult = await runSQLVerification();
      results.push(sqlResult);
    } catch (error) {
      console.log('⚠️  SQL verification skipped (psql not available or not configured)');
      results.push({
        name: 'SQL Verification Script',
        passed: false,
        duration: 0,
        error: 'Skipped - psql not available'
      });
    }
    
    // Run TypeScript verification (required)
    const tsResult = await runTypeScriptVerification();
    results.push(tsResult);
    
    // Generate report
    generateReport();
    
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION SUITE SUMMARY');
    console.log('='.repeat(80));
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    console.log(`\nTotal: ${results.length}`);
    console.log(`Passed: ${passed} ✓`);
    console.log(`Failed: ${failed} ✗`);
    
    if (failed === 0) {
      console.log('\n✅ ALL VERIFICATIONS PASSED');
      console.log('='.repeat(80) + '\n');
      process.exit(0);
    } else {
      console.log('\n❌ SOME VERIFICATIONS FAILED');
      console.log('Please review the report for details.');
      console.log('='.repeat(80) + '\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Verification suite failed:', error);
    process.exit(1);
  }
}

main();
