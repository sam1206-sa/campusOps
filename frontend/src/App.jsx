import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import AIAssistantModal from './components/AIAssistantModal';
import NotificationsDrawer from './components/NotificationsDrawer';
import { api } from './services/api';

function App() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchNotifications = async () => {
        try {
          const data = await api.getNotifications();
          setNotifications(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error("Failed to load notifications:", err);
          setNotifications([]);
        }
      };
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) {
    return <Login />;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'student':
        return <StudentDashboard activeTab={activeTab} searchTerm={searchTerm} />;
      case 'staff':
        return <StaffDashboard activeTab={activeTab} searchTerm={searchTerm} />;
      case 'admin':
        return <AdminDashboard activeTab={activeTab} searchTerm={searchTerm} />;
      default:
        return <div className="p-8">Unknown user role: {user.role}</div>;
    }
  };

  return (
    <div className="flex bg-[#F5F7FB] dark:bg-[#0b1329] text-[#494D5F] dark:text-slate-200 min-h-screen transition-colors duration-300">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Navbar 
          onOpenNotifications={() => setIsNotificationsOpen(true)} 
          notificationsCount={notifications.length} 
          onSearch={setSearchTerm} 
        />
        <div className="flex-1 overflow-y-auto">
          {renderDashboard()}
        </div>
      </div>
      <AIAssistantModal />
      <NotificationsDrawer 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
        notifications={notifications} 
      />
    </div>
  );
}

export default App;
