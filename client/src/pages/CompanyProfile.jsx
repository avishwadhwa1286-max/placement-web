import { useEffect, useState } from 'react';
import { Building2, Save } from 'lucide-react';
import api, { messageFrom } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Loading, Notice, PageHeader } from '../components/ui.jsx';

export default function CompanyProfile() {
  const { user } = useAuth(); const [form, setForm] = useState(user.company || null); const [notice, setNotice] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/companies/mine').then(r => setForm(r.data)).catch(e => setNotice({ type: 'error', text: messageFrom(e) })); }, []);
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async e => { e.preventDefault(); setBusy(true); try { const { data } = await api.put('/companies/mine', form); setForm(data); setNotice({ text: 'Company profile updated.' }); } catch (err) { setNotice({ type: 'error', text: messageFrom(err) }); } finally { setBusy(false); } };
  if (!form) return <Loading label="Loading company profile…" />;
  return <><PageHeader eyebrow="RECRUITER ACCOUNT" title="Company profile" description="These details are shown alongside the roles you publish to students." />{notice && <Notice value={notice} onClose={() => setNotice(null)} />}<section className="panel profile-panel company-edit-panel"><div className="panel-heading"><div><p className="eyebrow">ORGANIZATION DETAILS</p><h2>{form.name}</h2></div><Building2 size={20} className="panel-icon" /></div><form className="form-stack" onSubmit={submit}><div className="form-grid"><label>Company name<input name="name" value={form.name || ''} onChange={change} required /></label><label>Industry<input name="industry" value={form.industry || ''} onChange={change} /></label><label>Location<input name="location" value={form.location || ''} onChange={change} /></label><label>Website<input type="url" name="website" value={form.website || ''} onChange={change} placeholder="https://" /></label><label>Campus contact<input name="contactName" value={form.contactName || ''} onChange={change} /></label><label>Contact email<input type="email" name="contactEmail" value={form.contactEmail || ''} onChange={change} /></label></div><label>Company description<textarea name="description" rows="4" value={form.description || ''} onChange={change} /></label><p className="field-hint">Recruiter sign-in: {user.email}. Ask the Placement Office to change account access.</p><button className="button button-primary" disabled={busy}><Save size={16} /> {busy ? 'Saving…' : 'Save company profile'}</button></form></section></>;
}
