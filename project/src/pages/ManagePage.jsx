import { useState, useEffect } from 'react';
import { FiDownload, FiFilter, FiInfo } from 'react-icons/fi';
import ApplicationAnalytics from '../components/ApplicationAnalytics';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../lib/supabaseClient';

function ManagePage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data, error } = await subscriptionService.getAutomationSessions(user.id);
        
        if (error) {
          console.error('Error fetching sessions:', error);
        } else {
          setSessions(data || []);
        }
      } catch (err) {
        console.error('Error in fetchSessions:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, [user]);

  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    return session.platform === filter;
  });

  const platforms = [...new Set(sessions.map(s => s.platform))];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformColor = (platform) => {
    const colors = {
      linkedin: 'bg-blue-100 text-blue-800',
      indeed: 'bg-purple-100 text-purple-800',
      internshala: 'bg-green-100 text-green-800',
      unstop: 'bg-amber-100 text-amber-800'
    };
    
    return colors[platform] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Manage Automation History</h1>

      {/* Analytics Component */}
      <div className="mb-8">
        <ApplicationAnalytics />
      </div>
      
      {/* Session History */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Automation History</h2>
            
            <div className="flex space-x-4">
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="block appearance-none bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Platforms</option>
                  {platforms.map(platform => (
                    <option key={platform} value={platform}>{platform.charAt(0).toUpperCase() + platform.slice(1)}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <FiFilter />
                </div>
              </div>
              
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <FiDownload className="mr-2" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading automation history...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="mb-4">
              <FiInfo className="mx-auto h-12 w-12 text-gray-400" />
            </div>
            <p className="text-lg font-medium">No automation history found</p>
            <p className="mt-1">Start a new automation to see your history here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jobs Applied</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSessions.map((session) => {
                  // Calculate duration if both start and end timestamps exist
                  let duration = '-';
                  if (session.session_start && session.session_end) {
                    const startTime = new Date(session.session_start).getTime();
                    const endTime = new Date(session.session_end).getTime();
                    const durationMs = endTime - startTime;
                    const minutes = Math.floor(durationMs / 60000);
                    const seconds = Math.floor((durationMs % 60000) / 1000);
                    duration = `${minutes}m ${seconds}s`;
                  }
                  
                  return (
                    <tr key={session.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlatformColor(session.platform)}`}>
                          {session.platform.charAt(0).toUpperCase() + session.platform.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(session.session_start)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.jobs_applied} / {session.jobs_requested}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${session.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          session.status === 'started' ? 'bg-blue-100 text-blue-800' : 
                          'bg-red-100 text-red-800'}`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {duration}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManagePage;