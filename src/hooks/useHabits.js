import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/apiClient.js';

// Thin wrapper over the habits CRUD endpoints + local list state.
export function useHabits() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listHabits();
      setHabits(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createHabit = useCallback(async (name, color, icon, schedule) => {
    const habit = await apiClient.createHabit(name, color, icon, schedule);
    await reload();
    return habit;
  }, [reload]);

  const updateHabit = useCallback(async (id, patch) => {
    const habit = await apiClient.updateHabit(id, patch);
    await reload();
    return habit;
  }, [reload]);

  const deleteHabit = useCallback(async (id) => {
    await apiClient.deleteHabit(id);
    await reload();
  }, [reload]);

  return { habits, loading, error, reload, createHabit, updateHabit, deleteHabit };
}

export default useHabits;
