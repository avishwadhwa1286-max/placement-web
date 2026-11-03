import { X } from 'lucide-react';

export function PageHeader({ eyebrow, title, description, action }) { return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>; }
export function StatCard({ label, value, note, icon: Icon }) { return <article className="stat-card"><div className="stat-top"><span>{label}</span>{Icon && <Icon size={18} strokeWidth={1.8} />}</div><strong>{value ?? '—'}</strong>{note && <small>{note}</small>}</article>; }
export function StatusBadge({ status }) { const className = String(status || '').toLowerCase().replaceAll(' ', '-'); return <span className={`status status-${className}`}>{status || '—'}</span>; }
export function EmptyState({ title, description }) { return <div className="empty-state"><div className="empty-mark">—</div><strong>{title}</strong><p>{description}</p></div>; }
export function Notice({ value, onClose }) { if (!value) return null; return <div className={`notice ${value.type || 'success'}`} role="status">{value.text}{onClose && <button className="notice-close" onClick={onClose} aria-label="Dismiss"><X size={16} /></button>}</div>; }
export function Modal({ title, onClose, children, wide = false }) { return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true"><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></header>{children}</section></div>; }
export function Loading({ label = 'Loading your placement data…' }) { return <div className="loading"><span className="spinner" />{label}</div>; }
