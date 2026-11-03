import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, Bell, BriefcaseBusiness, Building2, ChartNoAxesColumn, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const links = {
  admin: [{ to: '/dashboard', label: 'Overview', icon: LayoutDashboard }, { to: '/students', label: 'Students', icon: Users }, { to: '/companies', label: 'Companies', icon: Building2 }, { to: '/drives', label: 'Placement drives', icon: BriefcaseBusiness }, { to: '/applications', label: 'Applications', icon: FileText }, { to: '/announcements', label: 'Announcements', icon: Bell }],
  student: [{ to: '/dashboard', label: 'My overview', icon: LayoutDashboard }, { to: '/drives', label: 'Find a drive', icon: BriefcaseBusiness }, { to: '/applications', label: 'My applications', icon: FileText }, { to: '/profile', label: 'My profile', icon: GraduationCap }, { to: '/announcements', label: 'Announcements', icon: Bell }],
  recruiter: [{ to: '/dashboard', label: 'Overview', icon: LayoutDashboard }, { to: '/drives', label: 'Your drives', icon: BriefcaseBusiness }, { to: '/applications', label: 'Applicants', icon: Users }, { to: '/company', label: 'Company profile', icon: Building2 }, { to: '/announcements', label: 'Announcements', icon: Bell }]
};
const roleName = { admin: 'Placement officer', student: 'Student portal', recruiter: 'Recruiter portal' };
export default function PortalLayout() {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const [open, setOpen] = useState(false);
  const signOut = () => { logout(); navigate('/login'); };
  return <div className="portal-shell">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-seal"><GraduationCap size={22} /></div><div><strong>SKIT</strong><small>UNIVERSITY · PLACEMENTS</small></div><button className="mobile-close" onClick={() => setOpen(false)}><X size={20} /></button></div>
      <div className="sidebar-caption">WORKSPACE</div><nav>{(links[user?.role] || []).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-foot"><div className="user-avatar">{user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('')}</div><div className="user-meta"><strong>{user?.name}</strong><small>{roleName[user?.role]}</small></div><button className="icon-button signout-icon" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button></div>
    </aside>
    {open && <button className="mobile-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
    <main className="main-shell"><header className="topbar"><button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="breadcrumb"><span>SKIT</span><span className="crumb-divider">/</span><b>{roleName[user?.role]}</b></div><div className="topbar-right"><span className="academic-year"><Activity size={14} /> Placement season 2026–27</span><div className="top-avatar">{user?.name?.[0]}</div></div></header><div className="content-area"><Outlet /></div><footer className="site-footer"><span>Career Services · SKIT</span><span>Academic year 2026–27</span></footer></main>
  </div>;
}
