/**
 * Client-Side Code Execution & Test Case Verification Engine
 * Provides immediate feedback, interactive test execution against 3 visible test cases,
 * and comprehensive verification against hidden states/test cases.
 */

// Deep Equality Checker
export function deepEqual(actual, expected) {
  if (actual === expected) return true;

  if (actual === null || expected === null || actual === undefined || expected === undefined) {
    return actual === expected;
  }

  if (typeof actual !== typeof expected) {
    return false;
  }

  if (typeof actual === 'number' && typeof expected === 'number') {
    if (isNaN(actual) && isNaN(expected)) return true;
    return Math.abs(actual - expected) < 1e-6;
  }

  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) {
      if (!deepEqual(actual[i], expected[i])) return false;
    }
    return true;
  }

  if (typeof actual === 'object' && typeof expected === 'object') {
    const keysA = Object.keys(actual);
    const keysB = Object.keys(expected);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(expected, key)) return false;
      if (!deepEqual(actual[key], expected[key])) return false;
    }
    return true;
  }

  return false;
}

// Safely format values for console output & diff inspection
export function formatValue(val) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'function') return '[Function]';
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

/**
 * Execute JavaScript Code against test cases
 */
export function executeJavaScriptLocally({ code, functionName, visibleTestCases = [], hiddenTestCases = [], includeHidden = false }) {
  const logs = [];
  const startTime = performance.now();

  const executionResults = {
    visibleResults: [],
    hiddenResults: [],
    allPassed: false,
    visiblePassed: 0,
    visibleTotal: visibleTestCases.length,
    hiddenPassed: 0,
    hiddenTotal: hiddenTestCases.length,
    totalPassed: 0,
    totalTestCases: visibleTestCases.length + (includeHidden ? hiddenTestCases.length : 0),
    runtimeMs: 0,
    error: null
  };

  try {
    // Intercept console.log statements safely
    const customConsole = {
      log: (...args) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      warn: (...args) => logs.push('[WARN] ' + args.join(' ')),
      error: (...args) => logs.push('[ERROR] ' + args.join(' '))
    };

    // Create a sandboxed evaluation function
    // Wraps candidate code and extracts the function by name
    const evaluatedRunner = new Function(
      'console',
      `
      "use strict";
      ${code};
      if (typeof ${functionName} === 'function') {
        return ${functionName};
      }
      throw new Error("Function '${functionName}' was not defined. Please declare 'function ${functionName}(...)'");
      `
    );

    const candidateFn = evaluatedRunner(customConsole);

    // 1. Evaluate 3 Visible Test Cases
    for (const testCase of visibleTestCases) {
      const testStart = performance.now();
      try {
        // Deep copy inputs so candidate code mutation does not alter test cases
        const argsCopy = JSON.parse(JSON.stringify(testCase.inputArgs || []));
        const actualOutput = candidateFn(...argsCopy);
        const testRuntime = Math.round((performance.now() - testStart) * 100) / 100;
        const passed = deepEqual(actualOutput, testCase.expectedOutput);

        if (passed) executionResults.visiblePassed++;

        executionResults.visibleResults.push({
          id: testCase.id,
          inputRaw: testCase.inputRaw,
          expectedOutput: testCase.expectedOutput,
          actualOutput: actualOutput !== undefined ? actualOutput : null,
          passed,
          status: passed ? 'PASSED' : 'FAILED',
          runtimeMs: testRuntime,
          explanation: testCase.explanation
        });
      } catch (testErr) {
        executionResults.visibleResults.push({
          id: testCase.id,
          inputRaw: testCase.inputRaw,
          expectedOutput: testCase.expectedOutput,
          actualOutput: null,
          passed: false,
          status: 'ERROR',
          error: testErr.message,
          runtimeMs: 0,
          explanation: testCase.explanation
        });
      }
    }

    // 2. Evaluate Hidden Test Cases / States
    if (includeHidden && hiddenTestCases.length > 0) {
      for (const hiddenCase of hiddenTestCases) {
        const testStart = performance.now();
        try {
          const argsCopy = JSON.parse(JSON.stringify(hiddenCase.inputArgs || []));
          const actualOutput = candidateFn(...argsCopy);
          const testRuntime = Math.round((performance.now() - testStart) * 100) / 100;
          const passed = deepEqual(actualOutput, hiddenCase.expectedOutput);

          if (passed) executionResults.hiddenPassed++;

          executionResults.hiddenResults.push({
            id: hiddenCase.id,
            title: hiddenCase.title || 'Hidden Test Case',
            passed,
            status: passed ? 'PASSED' : 'FAILED',
            runtimeMs: testRuntime,
            edgeCaseType: hiddenCase.edgeCaseType || 'Boundary Condition'
          });
        } catch (testErr) {
          executionResults.hiddenResults.push({
            id: hiddenCase.id,
            title: hiddenCase.title || 'Hidden Test Case',
            passed: false,
            status: 'ERROR',
            error: testErr.message,
            runtimeMs: 0,
            edgeCaseType: hiddenCase.edgeCaseType || 'Boundary Condition'
          });
        }
      }
    }

    executionResults.totalPassed = executionResults.visiblePassed + executionResults.hiddenPassed;
    executionResults.allPassed = (executionResults.visiblePassed === executionResults.visibleTotal) &&
      (!includeHidden || executionResults.hiddenPassed === executionResults.hiddenTotal);
    executionResults.runtimeMs = Math.round((performance.now() - startTime) * 10) / 10;

    return {
      success: true,
      logs,
      executionResults
    };
  } catch (err) {
    executionResults.error = err.message;
    executionResults.runtimeMs = Math.round((performance.now() - startTime) * 10) / 10;
    return {
      success: false,
      error: err.message,
      logs,
      executionResults
    };
  }
}
