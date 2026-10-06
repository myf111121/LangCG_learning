// A fresh module worker isolates each run and can be terminated for infinite loops.
self.onmessage = async ({ data }) => {
  try {
    self.postMessage({ type: 'loading' });
    const { loadPyodide } = await import('https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs');
    const python = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/' });
    self.postMessage({ type: 'running' });
    const result = await python.runPythonAsync(data.script);
    self.postMessage({ type: 'result', result: JSON.parse(result) });
  } catch (error) {
    self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
};
