import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardHR from './pages/DashboardHR';
import DashboardUser from './pages/DashboardUser';
import Ujian from './pages/Ujian';
import Materi from './pages/Materi';
import Riwayat from './pages/Riwayat';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen bg-gradient-to-br from-primary-100/30 to-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route element={<PrivateRoute />}>
                <Route path="/dashboard-hr" element={<DashboardHR />} />
                <Route path="/dashboard" element={<DashboardUser />} />
                <Route path="/ujian/:bidangId" element={<Ujian />} />
                <Route path="/materi/:bidangId" element={<Materi />} />
                <Route path="/riwayat" element={<Riwayat />} />
              </Route>
              
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;