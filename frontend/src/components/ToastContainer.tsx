import React from 'react';
import { useProjectStore } from '../state/store';

export const ToastContainer: React.FC = () => {
    const { toasts, dismissToast } = useProjectStore(s => ({ toasts: s.toasts, dismissToast: s.dismissToast }));
    if (!toasts.length) return null;
    return (
        <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    background: t.kind === 'error' ? '#B3261E' : t.kind === 'success' ? '#065f46' : '#1f2937',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    animation: 'fadeIn .25s ease'
                }}>
                    <div style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</div>
                    <button aria-label="Dismiss" onClick={() => dismissToast(t.id)} style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        fontSize: 14,
                        lineHeight: 1,
                        padding: 2
                    }}>✕</button>
                </div>
            ))}
            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
    );
};
