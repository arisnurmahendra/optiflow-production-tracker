const DEFAULT_TIMEOUT_MS = 30000;

const CALLABLES = Object.freeze({
  bootstrapSheets: 'bootstrapSheets',
  checkPermission: 'checkPermission',
  deleteScriptProperty: 'deleteScriptProperty',
  getHealthCheck: 'getHealthCheck',
  getSchemaHealthCheck: 'getSchemaHealthCheck',
  getScriptPropertiesStatus: 'getScriptPropertiesStatus',
  getSessionContext: 'getSessionContext',
  rotateSecretProperty: 'rotateSecretProperty',
  setScriptProperty: 'setScriptProperty',
  submitProductionReport: 'submitProductionReport',
});

export class ApiAdapterError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiAdapterError';
    this.code = options.code || 'API_ERROR';
    this.details = options.details || {};
  }
}

export function createApiAdapter(options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  async function call(functionName, payload, callOptions = {}) {
    assertAllowedCallable(functionName);

    const timeout = callOptions.timeoutMs || timeoutMs;
    const transport = callOptions.transport || options.transport || resolveTransport();
    const response = await withTimeout(
      transport(functionName, payload),
      timeout,
      functionName,
    );

    return normalizeResponse(response, functionName);
  }

  return Object.freeze({
    call,
    bootstrapSheets: (request = {}) => call(CALLABLES.bootstrapSheets, request),
    checkPermission: (request) => call(CALLABLES.checkPermission, request),
    deleteScriptProperty: (request) => call(CALLABLES.deleteScriptProperty, request),
    getHealthCheck: () => call(CALLABLES.getHealthCheck),
    getSchemaHealthCheck: (request = {}) => call(CALLABLES.getSchemaHealthCheck, request),
    getScriptPropertiesStatus: (request = {}) => call(CALLABLES.getScriptPropertiesStatus, request),
    getSessionContext: (request = {}) => call(CALLABLES.getSessionContext, request),
    rotateSecretProperty: (request) => call(CALLABLES.rotateSecretProperty, request),
    setScriptProperty: (request) => call(CALLABLES.setScriptProperty, request),
    submitProductionReport: (request) => call(CALLABLES.submitProductionReport, request),
  });
}

export const api = createApiAdapter();

export function assertAllowedCallable(functionName) {
  if (!Object.values(CALLABLES).includes(functionName)) {
    throw new ApiAdapterError('Callable is not allowlisted.', {
      code: 'CALLABLE_NOT_ALLOWED',
      details: { functionName },
    });
  }
}

function resolveTransport() {
  if (typeof window !== 'undefined' && window.__OPTIFLOW_MOCK_GAS__) {
    return createMockTransport(window.__OPTIFLOW_MOCK_GAS__);
  }

  if (typeof window !== 'undefined' && window.google?.script?.run) {
    return createGoogleScriptRunTransport(window.google.script.run);
  }

  return function unavailableTransport(functionName) {
    return Promise.reject(new ApiAdapterError('GAS transport is not available.', {
      code: 'TRANSPORT_UNAVAILABLE',
      details: { functionName },
    }));
  };
}

function createMockTransport(mockGas) {
  return function mockTransport(functionName, payload) {
    if (typeof mockGas[functionName] !== 'function') {
      return Promise.reject(new ApiAdapterError('Mock GAS callable is missing.', {
        code: 'MOCK_CALLABLE_MISSING',
        details: { functionName },
      }));
    }

    return mockGas[functionName](payload);
  };
}

function createGoogleScriptRunTransport(scriptRun) {
  return function googleScriptRunTransport(functionName, payload) {
    return new Promise((resolve, reject) => {
      const runner = scriptRun
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => {
          reject(new ApiAdapterError('GAS callable failed.', {
            code: 'GAS_FAILURE',
            details: {
              functionName,
              message: sanitizeErrorMessage(error),
            },
          }));
        });

      if (payload === undefined) {
        runner[functionName]();
      } else {
        runner[functionName](payload);
      }
    });
  };
}

async function withTimeout(promise, timeoutMs, functionName) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new ApiAdapterError('GAS callable timed out.', {
        code: 'TIMEOUT',
        details: { functionName, timeoutMs },
      }));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function normalizeResponse(response, functionName) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new ApiAdapterError('Invalid GAS response shape.', {
      code: 'INVALID_RESPONSE',
      details: { functionName },
    });
  }

  if (response.ok === true) {
    return {
      ok: true,
      data: response.data || {},
      meta: response.meta || {},
      error: null,
    };
  }

  throw new ApiAdapterError(response.error?.message || 'GAS returned an error.', {
    code: response.error?.code || 'GAS_RESPONSE_ERROR',
    details: {
      functionName,
      meta: response.meta || {},
    },
  });
}

function sanitizeErrorMessage(error) {
  if (!error) {
    return 'Unknown error';
  }

  return String(error.message || error).replace(/\s+at\s+.+/g, '').slice(0, 240);
}

export const allowedCallables = Object.freeze({ ...CALLABLES });
