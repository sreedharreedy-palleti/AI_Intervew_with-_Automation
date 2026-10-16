import sys
import json
import time
import subprocess
import tempfile
import os
from typing import Dict, Any, List, Tuple


RUNNER_SCRIPT = """
import sys
import json
import inspect
import traceback

def safe_call(func, inp):
    if isinstance(inp, dict):
        try:
            return func(**inp)
        except TypeError:
            return func(inp)
    elif isinstance(inp, list):
        try:
            sig = inspect.signature(func)
            if len(sig.parameters) == len(inp):
                return func(*inp)
        except Exception:
            pass
        return func(inp)
    else:
        return func(inp)

def normalize(val):
    if isinstance(val, (list, tuple)):
        return [normalize(x) for x in val]
    if isinstance(val, dict):
        return {k: normalize(v) for k, v in val.items()}
    if isinstance(val, float) and val.is_integer():
        return int(val)
    return val

def compare_outputs(actual, expected):
    return normalize(actual) == normalize(expected)

def main():
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        data = json.load(f)

    code = data.get("code", "")
    func_name = data.get("function_name", "solution")
    public_tests = data.get("public_tests", [])
    hidden_tests = data.get("hidden_tests", [])

    results = {
        "success": False,
        "compile_error": None,
        "public_results": [],
        "hidden_results": [],
        "stdout": ""
    }

    # Prepare sandbox namespace
    import io
    captured_stdout = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = captured_stdout

    scope = {}
    try:
        exec(code, scope)
    except Exception as e:
        sys.stdout = old_stdout
        results["compile_error"] = traceback.format_exc()
        print(json.dumps(results))
        return

    # Find the target function
    target_func = scope.get(func_name)
    if not target_func or not callable(target_func):
        callables = [v for k, v in scope.items() if callable(v) and not k.startswith("__")]
        if callables:
            target_func = callables[-1]
        else:
            sys.stdout = old_stdout
            results["compile_error"] = f"Function '{func_name}' was not found in submitted code."
            print(json.dumps(results))
            return

    # Run public test cases
    for idx, test in enumerate(public_tests, start=1):
        test_in = test.get("input")
        expected = test.get("expected_output")
        start_t = time.perf_counter()
        test_res = {
            "test_index": idx,
            "input": test_in,
            "expected_output": expected,
            "actual_output": None,
            "passed": False,
            "execution_time_ms": 0.0,
            "error": None
        }
        try:
            actual = safe_call(target_func, test_in)
            test_res["actual_output"] = actual
            test_res["passed"] = compare_outputs(actual, expected)
        except Exception as e:
            test_res["error"] = str(e)
            test_res["passed"] = False
        test_res["execution_time_ms"] = round((time.perf_counter() - start_t) * 1000, 2)
        results["public_results"].append(test_res)

    # Run hidden test cases (DO NOT leak input or expected_output)
    for idx, test in enumerate(hidden_tests, start=1):
        test_in = test.get("input")
        expected = test.get("expected_output")
        start_t = time.perf_counter()
        passed = False
        try:
            actual = safe_call(target_func, test_in)
            passed = compare_outputs(actual, expected)
        except Exception:
            passed = False
        exec_ms = round((time.perf_counter() - start_t) * 1000, 2)

        results["hidden_results"].append({
            "test_index": idx,
            "passed": passed,
            "execution_time_ms": exec_ms,
            "status": "Passed" if passed else "Hidden State Not Satisfied"
        })

    sys.stdout = old_stdout
    results["stdout"] = captured_stdout.getvalue()
    results["success"] = True
    print(json.dumps(results))

if __name__ == "__main__":
    import time
    main()
"""


def execute_test_cases(
    code: str,
    function_name: str,
    public_tests: List[Dict[str, Any]],
    hidden_tests: List[Dict[str, Any]],
    language: str = "python",
    timeout_sec: float = 5.0
) -> Dict[str, Any]:
    """
    Executes submitted candidate code against public and hidden test cases in a subprocess.
    Hidden test cases do NOT leak input or expected output to the returned results.
    """
    if language.lower() not in ["python", "python3"]:
        return {
            "all_passed": False,
            "total_tests": len(public_tests) + len(hidden_tests),
            "passed_tests": 0,
            "public_results": [],
            "hidden_results": [],
            "stdout": "",
            "stderr": f"Language '{language}' execution is currently supported via Python runner.",
            "compile_error": f"Language '{language}' runner unavailable"
        }

    # Prepare temp files
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as data_file:
        data_path = data_file.name
        json.dump({
            "code": code,
            "function_name": function_name,
            "public_tests": public_tests,
            "hidden_tests": hidden_tests,
        }, data_file)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as script_file:
        script_path = script_file.name
        script_file.write(RUNNER_SCRIPT)

    try:
        proc = subprocess.run(
            [sys.executable, script_path, data_path],
            capture_output=True,
            text=True,
            timeout=timeout_sec
        )

        stdout_raw = proc.stdout.strip()
        stderr_raw = proc.stderr.strip()

        if proc.returncode != 0 and not stdout_raw:
            return {
                "all_passed": False,
                "total_tests": len(public_tests) + len(hidden_tests),
                "passed_tests": 0,
                "public_results": [],
                "hidden_results": [],
                "stdout": "",
                "stderr": stderr_raw,
                "compile_error": stderr_raw or "Execution error occurred."
            }

        try:
            output_lines = stdout_raw.splitlines()
            result_json = None
            for line in reversed(output_lines):
                line = line.strip()
                if line.startswith("{") and line.endswith("}"):
                    try:
                        result_json = json.loads(line)
                        break
                    except Exception:
                        continue

            if not result_json:
                result_json = json.loads(stdout_raw)

            pub_results = result_json.get("public_results", [])
            hid_results = result_json.get("hidden_results", [])
            compile_err = result_json.get("compile_error")

            pub_passed = sum(1 for r in pub_results if r.get("passed"))
            hid_passed = sum(1 for r in hid_results if r.get("passed"))
            total_tests = len(pub_results) + len(hid_results)
            passed_tests = pub_passed + hid_passed

            return {
                "all_passed": (total_tests > 0 and passed_tests == total_tests and not compile_err),
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "public_results": pub_results,
                "hidden_results": hid_results,
                "stdout": result_json.get("stdout", ""),
                "stderr": stderr_raw,
                "compile_error": compile_err
            }

        except Exception as parse_err:
            return {
                "all_passed": False,
                "total_tests": len(public_tests) + len(hidden_tests),
                "passed_tests": 0,
                "public_results": [],
                "hidden_results": [],
                "stdout": stdout_raw,
                "stderr": stderr_raw,
                "compile_error": f"Failed to parse test execution output: {parse_err}"
            }

    except subprocess.TimeoutExpired:
        return {
            "all_passed": False,
            "total_tests": len(public_tests) + len(hidden_tests),
            "passed_tests": 0,
            "public_results": [],
            "hidden_results": [],
            "stdout": "",
            "stderr": "Time Limit Exceeded (Execution exceeded 5.0s)",
            "compile_error": "Time Limit Exceeded (5.0s limit). Please check for infinite loops or unoptimized algorithms."
        }
    finally:
        for p in [data_path, script_path]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass