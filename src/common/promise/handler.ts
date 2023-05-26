export const RequestPromisesWithTimeout = async (
  promise: Promise<any>,
  timeout = 10000
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Promise timed out after ${timeout} ms`));
    }, timeout);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((reason) => {
        clearTimeout(timer);
        reject(reason);
      });
  });
};

export const RequestMultiplePromisesWithTimeout = async (
  promises: Promise<any>[],
  timeout = 10000
): Promise<{ success: any[]; error: any[] }> => {
  const timeoutPromises = promises.map((promise) =>
    RequestPromisesWithTimeout(promise, timeout)
  );

  const results = await Promise.allSettled(timeoutPromises);
  const success = [];
  const error = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      success.push(result.value);
    } else {
      error.push(result.reason);
    }
  }

  return { success, error };
};
