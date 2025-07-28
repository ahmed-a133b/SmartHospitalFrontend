import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import AdminDashboard from './views/AdminDashboard';
import DoctorDashboard from './views/DoctorDashboard';
import StaffDashboard from './views/StaffDashboard';
import Header from './Header';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('overview');

  const renderDashboard = () => {
    console.log('Dashboard: renderDashboard called with user role:', user?.role);
    console.log('Dashboard: activeView is:', activeView);
    
    switch (user?.role) {
      case 'admin':
        console.log('Dashboard: Rendering AdminDashboard');
        return <AdminDashboard activeView={activeView} />;
      case 'doctor':
        return <DoctorDashboard activeView={activeView} />;
      case 'staff':
        return <StaffDashboard activeView={activeView} />;
      default:
        console.log('Dashboard: Access denied for role:', user?.role);
        return <div>Access denied</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeView={activeView} setActiveView={setActiveView} userRole={user?.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          {renderDashboard()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;