const HISTORY_KEY = 'nmf_history';

export interface HistoryEntry {
  id: string;
  date: string; // ISO8601
  verdict: string; // VERDICT.PERFECT | VERDICT.FAULT | VERDICT.VAR_CHALLENGE
  angles: { shoulder: number; elbow: number; wrist: number };
  note: string;
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Skip any malformed entries
    return parsed.filter(
      (e) => e && typeof e.id === 'string' && typeof e.verdict === 'string'
    );
  } catch {
    return [];
  }
}

export function saveHistory(entry: Omit<HistoryEntry, 'id'>): void {
  try {
    const existing = loadHistory();
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };
    existing.push(newEntry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('[history] localStorage quota exceeded — entry not saved');
    }
  }
}

export function deleteHistoryEntry(id: string): void {
  try {
    const existing = loadHistory();
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(existing.filter((e) => e.id !== id))
    );
  } catch {
    // nothing to do
  }
}
