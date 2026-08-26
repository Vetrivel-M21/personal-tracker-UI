import { useEffect, useRef, useState } from 'react';
import { playSystemMessage } from '../utils/sound.js';

// Simple global toast: dispatch a CustomEvent so any component can call
// showToast(message) without needing a context provider wired everywhere.
export function showToast(message, isError = false) {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, isError } }));
}

export default function Toast() {
  const [state, setState] = useState({ message: '', isError: false, show: false });
  const timeoutRef = useRef(null);

  useEffect(() => {
    function onToast(e) {
      setState({ message: e.detail.message, isError: !!e.detail.isError, show: true });
      playSystemMessage(!!e.detail.isError);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setState((s) => ({ ...s, show: false }));
      }, 3200);
    }
    window.addEventListener('app-toast', onToast);
    return () => {
      window.removeEventListener('app-toast', onToast);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className={`toast${state.show ? ' show' : ''}${state.isError ? ' danger' : ''}`} id="app-toast">
      <span className="toast-icon">
        <i className={`fa-solid ${state.isError ? 'fa-circle-exclamation' : 'fa-circle-check'}`} />
      </span>
      <span>{state.message}</span>
    </div>
  );
}
