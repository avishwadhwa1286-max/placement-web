import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import api, { messageFrom } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, Loading, Modal, Notice, PageHeader } from '../components/ui.jsx';

function AnnouncementForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' }); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async e => { e.preventDefault(); setBusy(true); try { await onSave(form); } catch (err) { setError(messageFrom(err)); } finally { setBusy(false); } };
  return <form className="form-stack" onSubmit={submit}>{error && <Notice value={{ type: 'error', text: error }} />}<label>Announcement title<input value={form.title} maxLength="120" onChange={e => setForm({ ...form, title: e.target.value })} required /></label><label>Message<textarea rows="5" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required /></label><label>Audience<select value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })}><option value="all">Everyone</option><option value="students">Students</option><option value="recruiters">Recruiters</option></select></label><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Posting…' : 'Post announcement'}</button></div></form>;
}
export default function Announcements() {
  const { user } = useAuth(); const [items, setItems] = useState(null); const [modal, setModal] = useState(false); const [notice, setNotice] = useState(null);
  const load = () => api.get('/announcements').then(r => setItems(r.data)).catch(() => setItems([])); useEffect(() => { load(); }, []);
  const create = async form => { await api.post('/announcements', form); setModal(false); setNotice({ text: 'Announcement posted.' }); await load(); };
  const remove = async item => { if (!window.confirm(`Remove “${item.title}”?`)) return; try { await api.delete(`/announcements/${item._id}`); await load(); setNotice({ text: 'Announcement removed.' }); } catch (e) { setNotice({ type: 'error', text: messageFrom(e) }); } };
  if (!items) return <Loading />;
  return <><PageHeader eyebrow="CAMPUS UPDATES" title="Announcements" description="Updates and notices from the SKIT Placement Office." action={user.role === 'admin' ? <button className="button button-primary" onClick={() => setModal(true)}><Plus size={16} /> Post announcement</button> : null} />{notice && <Notice value={notice} onClose={() => setNotice(null)} />}{items.length ? <div className="announcement-list">{items.map(item => <article className="announcement-card" key={item._id}><div className="announcement-mark"><Bell size={18} /></div><div className="announcement-copy"><div className="announcement-meta"><span>{item.audience === 'all' ? 'CAMPUS NOTICE' : item.audience.toUpperCase()}</span><span>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div><h2>{item.title}</h2><p>{item.body}</p><small>Posted by {item.postedBy?.name || 'Placement Office'}</small></div>{user.role === 'admin' && <button className="icon-button danger-icon" title="Remove announcement" onClick={() => remove(item)}><Trash2 size={16} /></button>}</article>)}</div> : <EmptyState title="No announcements right now" description="Placement updates from your college will appear here." />}{modal && <Modal title="Post an announcement" onClose={() => setModal(false)}><AnnouncementForm onSave={create} onCancel={() => setModal(false)} /></Modal>}</>;
}
