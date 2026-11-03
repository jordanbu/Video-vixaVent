import { DIRECTORY_PERMISSION, isBrowserDirectoryHandle, safeDirectoryLabel, type BrowserExportDirectoryHandle, type ExportDestination } from './exportDestinationModel';

interface PromiseResolvers<T> {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
}

const promiseConstructor = Promise as unknown as {
  withResolvers<T>(): PromiseResolvers<T>;
};

const DATABASE_NAME = 'vixaventora-export-destinations';
const STORE_NAME = 'destinations';
const LAST_BROWSER_DIRECTORY_KEY = 'last-browser-directory';
function openDestinationDatabase(): Promise<IDBDatabase> {
  const { promise, resolve, reject } = promiseConstructor.withResolvers<IDBDatabase>();
  const request = indexedDB.open(DATABASE_NAME, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Could not open the export folder storage'));
  request.onblocked = () => reject(new Error('The export folder storage is in use by another page'));
  return promise;
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  const { promise, resolve, reject } = promiseConstructor.withResolvers<void>();
  transaction.oncomplete = () => resolve(undefined);
  transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the export folder'));
  transaction.onabort = () => reject(transaction.error ?? new Error('Saving the export folder was cancelled'));
  return promise;
}

async function readBrowserDirectory(): Promise<BrowserExportDirectoryHandle | null> {
  let database: IDBDatabase | null = null;
  try {
    database = await openDestinationDatabase();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(LAST_BROWSER_DIRECTORY_KEY);
    const { promise, resolve, reject } = promiseConstructor.withResolvers<unknown>();
    request.onsuccess = () => resolve(request.result as unknown);
    request.onerror = () => reject(request.error ?? new Error('Could not read the export folder'));
    const value = await promise;
    return isBrowserDirectoryHandle(value) ? value : null;
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

export async function saveBrowserDirectory(handle: BrowserExportDirectoryHandle): Promise<void> {
  let database: IDBDatabase | null = null;
  try {
    database = await openDestinationDatabase();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(handle, LAST_BROWSER_DIRECTORY_KEY);
    await transactionComplete(transaction);
  } finally {
    database?.close();
  }
}

async function forgetBrowserDirectory(): Promise<void> {
  let database: IDBDatabase | null = null;
  try {
    database = await openDestinationDatabase();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(LAST_BROWSER_DIRECTORY_KEY);
    await transactionComplete(transaction);
  } catch {
    // A denied or invalid handle can safely remain if IndexedDB is unavailable.
  } finally {
    database?.close();
  }
}

export async function restoredBrowserDestination(): Promise<ExportDestination | null> {
  const handle = await readBrowserDirectory();
  if (!handle) return null;
  try {
    const permission = await handle.queryPermission(DIRECTORY_PERMISSION);
    if (permission === 'granted' || permission === 'prompt') {
      return Object.freeze({ type: 'browser-directory', label: safeDirectoryLabel(handle.name), handle });
    }
  } catch {
    // An invalidated structured clone is treated like a denied handle.
  }
  await forgetBrowserDirectory();
  return null;
}
