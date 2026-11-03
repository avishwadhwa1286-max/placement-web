import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import PortalLayout from './components/PortalLayout.jsx';
import { Loading } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Drives from './pages/Drives.jsx';
import Applications from './pages/Applications.jsx';
import Profile from './pages/Profile.jsx';
import Students from './pages/Students.jsx';
import Companies from './pages/Companies.jsx';
import Announcements from './pages/Announcements.jsx';
import CompanyProfile from './pages/CompanyProfile.jsx';

function Protected({ allow: allowed, children }) {
  const { user, loading } = useAuth(); if (loading) return <Loading />; if (!user) return <Navigate to="/login" replace />; if (allowed && !allowed.includes(user.role)) return <Navigate to="/dashboard" replace />; return children;
}
function Landing() { const { user, loading } = useAuth(); return loading ? <Loading /> : <Navigate to={user ? '/dashboard' : '/login'} replace />; }
export default function App() {
  return <Routes><Route path="/" element={<Landing />} /><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
    <Route element={<Protected><PortalLayout /></Protected>}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/drives" element={<Drives />} />
      <Route path="/applications" element={<Applications />} />
      <Route path="/profile" element={<Protected allow={['student']}><Profile /></Protected>} />
      <Route path="/students" element={<Protected allow={['admin']}><Students /></Protected>} />
      <Route path="/companies" element={<Protected allow={['admin']}><Companies /></Protected>} />
      <Route path="/company" element={<Protected allow={['recruiter']}><CompanyProfile /></Protected>} />
      <Route path="/announcements" element={<Announcements />} />
    </Route><Route path="*" element={<Landing />} /></Routes>;
}
