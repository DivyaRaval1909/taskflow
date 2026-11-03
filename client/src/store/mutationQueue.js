
let mutationQueue = Promise.resolve();

export const enqueueMutation = (operation) => {
  const result = mutationQueue.then(operation);

  // Keep the queue usable even if one operation fails.
  mutationQueue = result.catch(() => {});

  return result;
};

export const resetMutationQueue = () => {
  mutationQueue = Promise.resolve();
};
