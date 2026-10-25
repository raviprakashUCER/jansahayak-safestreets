/**
 * IndexedDB & localStorage Client-Side Storage Engine for Offline Complaint Drafts
 * PRD / Master Prompt Feature 11
 */

export interface OfflineDraft {
  localId: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  photos: Array<{
    id: string;
    filename: string;
    base64: string;
    byteSize: number;
    capturedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  syncStatus: "draft" | "queued_for_sync" | "syncing" | "failed" | "synced";
  syncError?: string;
  serverId?: string;
  idempotencyKey: string;
}

const DB_NAME = "jansahayak_offline_store";
const DB_VERSION = 1;
const STORE_NAME = "drafts";
const LOCAL_STORAGE_KEY = "jansahayak_offline_drafts_fallback";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB not supported in this environment"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "localId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves or updates an offline draft in IndexedDB with localStorage fallback.
 */
export async function saveOfflineDraft(draft: OfflineDraft): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ ...draft, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // LocalStorage Fallback
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        const list: OfflineDraft[] = raw ? JSON.parse(raw) : [];
        const filtered = list.filter((d) => d.localId !== draft.localId);
        filtered.push({ ...draft, updatedAt: new Date().toISOString() });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      } catch (err) {
        console.warn("Offline drafts storage write failed:", err);
      }
    }
  }
}

/**
 * Retrieves all saved offline drafts.
 */
export async function getAllOfflineDrafts(): Promise<OfflineDraft[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as OfflineDraft[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}

/**
 * Deletes a draft by localId.
 */
export async function deleteOfflineDraft(localId: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(localId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        const list: OfflineDraft[] = raw ? JSON.parse(raw) : [];
        const filtered = list.filter((d) => d.localId !== localId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      } catch (err) {
        console.warn("Failed to delete offline draft from localStorage:", err);
      }
    }
  }
}
