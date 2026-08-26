import { useCallback, useState } from 'react';
import { apiClient } from '../api/apiClient.js';

// Thin wrapper over the daily-progress endpoints. Handles both the
// single-day check-in entry (Dashboard) and a date-range list (Tracker's
// history/ledger + recomputed monthly stats).
export function useProgress() {
  const [entry, setEntry] = useState(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState(null);

  const [rangeEntries, setRangeEntries] = useState([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState(null);

  const loadEntry = useCallback(async (date) => {
    setEntryLoading(true);
    setEntryError(null);
    try {
      const data = await apiClient.getProgressByDate(date);
      setEntry(data);
      return data;
    } catch (err) {
      setEntryError(err);
      setEntry(null);
      throw err;
    } finally {
      setEntryLoading(false);
    }
  }, []);

  // Saves and returns the full snapshot: {entry, xp, level, xp_into_level, xp_for_next_level, current_streak, shields_remaining}
  const saveEntry = useCallback(async (date, payload) => {
    const snapshot = await apiClient.saveProgress(date, payload);
    setEntry(snapshot.entry);
    return snapshot;
  }, []);

  const deleteEntry = useCallback(async (date) => {
    const snapshot = await apiClient.deleteProgress(date);
    setEntry(null);
    return snapshot;
  }, []);

  const loadRange = useCallback(async (from, to) => {
    setRangeLoading(true);
    setRangeError(null);
    try {
      const data = await apiClient.listProgress({ from, to });
      const list = Array.isArray(data) ? data : (data?.entries ?? []);
      setRangeEntries(list);
      return list;
    } catch (err) {
      setRangeError(err);
      setRangeEntries([]);
      throw err;
    } finally {
      setRangeLoading(false);
    }
  }, []);

  return {
    entry, entryLoading, entryError, loadEntry, saveEntry, deleteEntry,
    rangeEntries, rangeLoading, rangeError, loadRange,
  };
}

export default useProgress;
