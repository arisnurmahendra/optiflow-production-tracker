var OptiflowResponse = (function () {
  function success(data, meta) {
    return {
      ok: true,
      data: data || null,
      meta: meta || {},
      error: null,
    };
  }

  function failure(code, message, details) {
    return {
      ok: false,
      data: null,
      meta: {},
      error: {
        code: code,
        message: message,
        details: details || {},
      },
    };
  }

  return Object.freeze({
    success: success,
    failure: failure,
  });
})();
