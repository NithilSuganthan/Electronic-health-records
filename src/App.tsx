import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layout & Pages
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Doctors from './pages/Doctors';
import Departments from './pages/Departments';
import Appointments from './pages/Appointments';
import Prescriptions from './pages/Prescriptions';
import MyAppointments from './pages/MyAppointments';
import MyRecords from './pages/MyRecords';
import BookAppointment from './pages/BookAppointment';
import MyPatients from './pages/MyPatients';
import AdminLogin from './pages/AdminLogin';
import AiAdvisor from './pages/AiAdvisor';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#1e293b',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/" element={<Layout />}>
            {/* Shared - Dashboard & Prescriptions viewable by all */}
            <Route index element={<Dashboard />} />
            <Route path="prescriptions" element={<Prescriptions />} />
            
            {/* Admin only */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="patients" element={<Patients />} />
              <Route path="doctors" element={<Doctors />} />
              <Route path="departments" element={<Departments />} />
              <Route path="appointments" element={<Appointments />} />
            </Route>
            
            {/* Doctor or Admin */}
            <Route element={<ProtectedRoute allowedRoles={['doctor', 'admin']} />}>
              <Route path="my-patients" element={<MyPatients />} />
            </Route>

            {/* Patient or Admin */}
            <Route element={<ProtectedRoute allowedRoles={['patient', 'admin']} />}>
              <Route path="my-records" element={<MyRecords />} />
              <Route path="book-appointment" element={<BookAppointment />} />
              <Route path="ai-advisor" element={<AiAdvisor />} />
            </Route>

            {/* Doctor or Patient or Admin */}
            <Route path="my-appointments" element={<MyAppointments />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
