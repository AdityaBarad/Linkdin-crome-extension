import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiSettings, FiLogOut, FiBell, FiUser } from 'react-icons/fi';

function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`bg-white shadow-lg transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} border-r border-gray-100`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          {sidebarOpen && <h1 className="text-xl font-bold gradient-text">JobAutoPilot</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
        
        <nav className="mt-8 px-2">
          <NavLink to="/dashboard/automate" className="sidebar-link mb-2">
            <FiHome size={20} />
            {sidebarOpen && <span>Automate</span>}
          </NavLink>
          <NavLink to="/dashboard/manage" className="sidebar-link mb-2">
            <FiSettings size={20} />
            {sidebarOpen && <span>Manage</span>}
          </NavLink>
          <button 
            onClick={() => navigate('/')} 
            className="sidebar-link w-full text-left mt-8 text-red-600 hover:bg-red-50"
          >
            <FiLogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-100">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-full relative">
                <FiBell size={20} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg">
                <FiUser size={20} />
                {sidebarOpen && <span className="text-sm font-medium">John Doe</span>}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Dashboard;