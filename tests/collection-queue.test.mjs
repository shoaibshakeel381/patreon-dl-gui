import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCollectionQueue } from '../src/main/CollectionQueue.ts';

test('discovers all pages, deduplicates, then downloads sequentially with delays', async () => {
  const events = [];
  const pages = { main: { ids: ['1', '2'], next: 'next' }, next: { ids: ['2', '3'], next: null }, shows: { ids: ['3', '4'], next: null } };
  await runCollectionQueue({
    starts: ['main', 'shows'], reverseDownloadOrder: false, signal: new AbortController().signal,
    fetchPage: async url => { events.push(`fetch:${url}`); return pages[url]; },
    download: async id => { events.push(`download:${id}`); },
    wait: async () => { events.push('wait'); }
  });
  assert.deepEqual(events, ['fetch:main', 'wait', 'fetch:next', 'wait', 'fetch:shows', 'wait', 'download:1', 'wait', 'download:2', 'wait', 'download:3', 'wait', 'download:4']);
});

test('continues after a collection fails and reports it', async () => {
  const events = [];
  await runCollectionQueue({ starts: ['main'], reverseDownloadOrder: false, signal: new AbortController().signal,
    fetchPage: async () => ({ ids: ['1', '2'], next: null }),
    wait: async () => {},
    download: async id => { events.push(id); if (id === '1') throw Error('failed'); },
    onFailure: id => events.push(`failed:${id}`)
  });
  assert.deepEqual(events, ['1', 'failed:1', '2']);
});

test('reverses download order when requested while preserving discovery order otherwise', async () => {
  const downloaded = [];
  await runCollectionQueue({ starts: ['main'], reverseDownloadOrder: true,
    signal: new AbortController().signal,
    fetchPage: async () => ({ ids: ['1', '2', '3'], next: null }),
    wait: async () => {}, download: async id => downloaded.push(id)
  });
  assert.deepEqual(downloaded, ['3', '2', '1']);
});

test('stops before the next collection when cancelled during the delay', async () => {
  const controller = new AbortController();
  const downloaded = [];
  let waits = 0;
  await assert.rejects(runCollectionQueue({ starts: ['main'], reverseDownloadOrder: false, signal: controller.signal,
    fetchPage: async () => ({ ids: ['1', '2'], next: null }),
    wait: async () => { if (++waits === 2) controller.abort(); },
    download: async id => downloaded.push(id)
  }), { name: 'AbortError' });
  assert.deepEqual(downloaded, ['1']);
});
