import { useEffect, useMemo, useState } from 'react';
import { apiClient, ApiError } from '../api/apiClient.js';
import { showToast } from '../components/Toast.jsx';
import EmptyState from '../components/system/EmptyState.jsx';
import { Skeleton } from '../components/system/Skeleton.jsx';

const COLUMNS = [
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export default function Todo() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient.listTodos()
      .then((data) => { if (!cancelled) setTodos(data || []); })
      .catch((err) => {
        if (!cancelled) showToast(err instanceof ApiError ? err.message : 'Failed to load to-dos.', true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const byStatus = useMemo(() => {
    const grouped = { todo: [], in_progress: [], done: [] };
    todos.forEach((t) => { (grouped[t.status] || grouped.todo).push(t); });
    return grouped;
  }, [todos]);

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const todo = await apiClient.createTodo(trimmed, priority);
      setTodos((prev) => [...prev, todo]);
      setTitle('');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to add to-do.', true);
    } finally {
      setAdding(false);
    }
  }

  async function handleMove(todo, direction) {
    const currentIndex = COLUMNS.findIndex((c) => c.status === todo.status);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= COLUMNS.length) return;
    const nextStatus = COLUMNS[nextIndex].status;
    try {
      const updated = await apiClient.updateTodo(todo.id, { status: nextStatus });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to move to-do.', true);
    }
  }

  async function handleDelete(id) {
    try {
      await apiClient.deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete to-do.', true);
    }
  }

  return (
    <>
      <div className="card glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
          <h2><i className="fa-solid fa-list-check" style={{ color: 'var(--primary)', marginRight: 8 }} />To-Do</h2>
        </div>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Add a to-do..."
            style={{ flex: 1, minWidth: 200 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: 140 }}>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label} Priority</option>)}
          </select>
          <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
            <i className="fa-solid fa-plus" /> Add
          </button>
        </form>
      </div>

      {loading && (
        <div className="todo-board">
          {COLUMNS.map((col) => (
            <div key={col.status} className="todo-column">
              <div className="todo-column-header">
                <span>{col.label}</span>
              </div>
              <Skeleton height={80} style={{ marginBottom: 8 }} />
              <Skeleton height={80} />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="todo-board">
          {COLUMNS.map((col, colIndex) => (
            <div key={col.status} className="todo-column">
              <div className="todo-column-header">
                <span>{col.label}</span>
                <span className="text-muted">{byStatus[col.status].length}</span>
              </div>
              {byStatus[col.status].length === 0 && (
                <EmptyState icon="fa-inbox" title="Empty" message="Nothing here yet." />
              )}
              {byStatus[col.status].map((todo) => (
                <div
                  key={todo.id}
                  className={`task-item-card todo-card${todo.status === 'done' ? ' checked' : ''}`}
                >
                  <div className="task-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <span className="task-title">{todo.title}</span>
                      <span className={`priority-badge ${todo.priority}`}>{todo.priority}</span>
                    </div>
                    <div className="todo-card-actions">
                      <div className="todo-move-buttons">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Move left"
                          disabled={colIndex === 0}
                          onClick={() => handleMove(todo, -1)}
                        >
                          <i className="fa-solid fa-arrow-left" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Move right"
                          disabled={colIndex === COLUMNS.length - 1}
                          onClick={() => handleMove(todo, 1)}
                        >
                          <i className="fa-solid fa-arrow-right" />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="task-delete-btn"
                        title="Delete"
                        onClick={() => handleDelete(todo.id)}
                      >
                        <i className="fa-solid fa-trash-can" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
