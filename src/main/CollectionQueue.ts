export interface CollectionQueueOptions {
  starts: string[];
  signal: AbortSignal;
  fetchPage: (url: string) => Promise<{ ids: string[]; next: string | null }>;
  download: (id: string, index: number, total: number) => Promise<void>;
  wait: () => Promise<void>;
  onFailure?: (id: string, error: unknown) => void;
  isFatal?: (error: unknown) => boolean;
}

export async function runCollectionQueue(options: CollectionQueueOptions): Promise<void> {
  const { starts, signal, fetchPage, download, wait, onFailure, isFatal } = options;
  const ids = new Set<string>();
  const visited = new Set<string>();
  let requested = false;
  for (const start of starts) {
    let next: string | null = start;
    while (next) {
      signal.throwIfAborted();
      if (visited.has(next)) throw new Error("Repeated collection pagination link");
      visited.add(next);
      if (requested) await wait();
      signal.throwIfAborted();
      const page = await fetchPage(next);
      requested = true;
      page.ids.forEach(id => ids.add(id));
      next = page.next;
    }
  }
  let index = 0;
  for (const id of ids) {
    signal.throwIfAborted();
    if (requested || index) await wait();
    signal.throwIfAborted();
    try {
      await download(id, index, ids.size);
    } catch (error) {
      if (signal.aborted || isFatal?.(error)) throw error;
      onFailure?.(id, error);
    }
    index++;
  }
}
