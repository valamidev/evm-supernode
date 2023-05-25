export const RequestPromisesWithTimeout = async (
  promise: Promise<any>,
  timeout = 10000
): Promise<any> => {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error(`Promise timed out after ${timeout} ms`));
      }, timeout);
    }),
  ]);
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

  timeoutPromises.forEach((promise) => {
    promise.catch(() => {});
  });

  return { success, error };
};
