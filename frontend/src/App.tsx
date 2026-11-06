import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Calibration from './pages/Calibration';
import Scan from './pages/Scan';
import Activity from './pages/Activity';
import Labels from './pages/Labels';
import Users from './pages/Users';

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/calibration" element={<Calibration />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/labels" element={<Labels />} />
        <Route path="/users" element={<Users />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
