// File System Access API helper.
// Lets the user pick a destination folder ONCE (defaults to "Documentos") and
// then saves every generated document straight into it. If the browser does not
// support the API, or no folder is configured, it falls back to a normal
// browser download so nothing ever breaks.

const DB_NAME = 'sigd-file-saver';
const STORE_NAME = 'handles';
const DIR_KEY = 'save-directory';

// Kept in memory to avoid re-reading IndexedDB on every save.
let cachedDir: any = null;

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<any> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, val: any): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDel(key: string): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** True only on browsers that support choosing a save folder (Chrome/Edge). */
export function isFolderSaveSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

async function loadDir(): Promise<any> {
  if (cachedDir) return cachedDir;
  try {
    cachedDir = await idbGet(DIR_KEY);
  } catch {
    cachedDir = null;
  }
  return cachedDir;
}

async function verifyPermission(dir: any, withRequest: boolean): Promise<boolean> {
  if (!dir) return false;
  const opts = { mode: 'readwrite' as const };
  try {
    if ((await dir.queryPermission(opts)) === 'granted') return true;
    if (withRequest && (await dir.requestPermission(opts)) === 'granted') return true;
  } catch {
    // Older implementations may not expose the permission methods.
  }
  return false;
}

/** Opens the native folder picker. MUST be called from a user gesture (a click). */
export async function pickSaveFolder(): Promise<string | null> {
  if (!isFolderSaveSupported()) throw new Error('unsupported');
  const dir = await (window as any).showDirectoryPicker({
    id: 'sigd-docs',
    mode: 'readwrite',
    startIn: 'documents',
  });
  cachedDir = dir;
  await idbSet(DIR_KEY, dir);
  return dir?.name ?? null;
}

/** Returns the remembered folder's name, or null if none is configured. */
export async function getSaveFolderName(): Promise<string | null> {
  const dir = await loadDir();
  return dir?.name ?? null;
}

/** Forgets the chosen folder; documents go back to normal downloads. */
export async function clearSaveFolder(): Promise<void> {
  cachedDir = null;
  try {
    await idbDel(DIR_KEY);
  } catch {
    // ignore
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Saves content to the configured folder when possible, otherwise downloads it.
 * Returns 'folder' or 'download' so the UI can tell the user what happened.
 * Call it inside a click handler so permission prompts are allowed to appear.
 */
export async function saveDocument(
  filename: string,
  content: BlobPart,
  mimeType: string,
): Promise<'folder' | 'download'> {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });

  if (isFolderSaveSupported()) {
    const dir = await loadDir();
    if (dir && (await verifyPermission(dir, true))) {
      try {
        const fileHandle = await dir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return 'folder';
      } catch (e) {
        console.warn('No se pudo guardar en la carpeta elegida, se descargará en su lugar:', e);
      }
    }
  }

  triggerDownload(blob, filename);
  return 'download';
}
