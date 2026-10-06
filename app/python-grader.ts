import type { CodeTest } from './code-challenges';

export type TestResult = { name: string; passed: boolean; detail: string };
export type GradingResult = { tests: TestResult[]; error: string | null; output: string };

// The same harness is exercised with CPython in scripts/check-challenges.mjs.
export function buildGradingScript(code: string, tests: CodeTest[]): string {
  return buildExecutionScript(code, tests, 'acceptance');
}

export function buildScenarioScript(code: string): string {
  return buildExecutionScript(code, [], 'scenario');
}

function buildExecutionScript(code: string, tests: CodeTest[], mode: 'acceptance' | 'scenario'): string {
  const input = JSON.stringify({ code, tests, mode });
  return `
import json as _json
import io as _io
import contextlib as _contextlib
import traceback as _traceback

class _LimitedOutput(_io.StringIO):
    def write(self, value):
        remaining = max(0, 4000 - self.tell())
        super().write(value[:remaining])
        return len(value)

def _grade(_input):
    _results = []
    _output = _LimitedOutput()
    def expect_equal(actual, expected):
        if actual != expected:
            raise AssertionError("预期: " + repr(expected)[:1000] + "\\n实际: " + repr(actual)[:1000])
    def expect_raises(exception_type, callback):
        try:
            callback()
        except exception_type:
            return
        except BaseException as error:
            raise AssertionError("预期异常: " + exception_type.__name__ + "；实际异常: " + type(error).__name__ + ": " + str(error)[:1000])
        raise AssertionError("预期抛出 " + exception_type.__name__ + "，实际没有抛出异常")
    try:
        _compiled = compile(_input["code"], "solution.py", "exec")
    except BaseException:
        return {"tests": [], "error": _traceback.format_exc(limit=3)[-3000:], "output": ""}
    if _input["mode"] == "scenario":
        try:
            with _contextlib.redirect_stdout(_output), _contextlib.redirect_stderr(_output):
                exec(_compiled, {"__name__": "__main__"})
            return {"tests": [], "error": None, "output": _output.getvalue()}
        except BaseException:
            return {"tests": [], "error": _traceback.format_exc(limit=4)[-3000:], "output": _output.getvalue()}
    for _case in _input["tests"]:
        try:
            with _contextlib.redirect_stdout(_output), _contextlib.redirect_stderr(_output):
                _solution = {"__name__": "solution"}
                exec(_compiled, _solution)
                _scope = dict(_solution)
                _scope.update(expect_equal=expect_equal, expect_raises=expect_raises)
                exec(compile(_case["code"], "acceptance_test.py", "exec"), _scope)
            _results.append({"name": _case["name"], "passed": True, "detail": "行为符合预期"})
        except BaseException:
            _results.append({"name": _case["name"], "passed": False, "detail": _traceback.format_exc(limit=4)[-3000:]})
    return {"tests": _results, "error": None, "output": _output.getvalue()}

_grading_result = _json.dumps(_grade(_json.loads(${JSON.stringify(input)})), ensure_ascii=False)
_grading_result
`;
}
