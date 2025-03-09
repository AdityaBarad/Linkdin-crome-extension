import { useState, useEffect } from 'react';
import { FiBarChart2, FiPieChart, FiCalendar, FiLoader } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

function ApplicationAnalytics() {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const { user, getApplicationStats } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getApplicationStats(period);
        setStats(data);
      } catch (error) {
        console.error('Error fetching application stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [user, period, getApplicationStats]);
  
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center h-56">
        <FiLoader className="animate-spin text-blue-600 mr-2" />
        <span>Loading analytics data...</span>
      </div>
    );
  }
  
  // If no data or no applications
  if (!stats || stats.totalJobsApplied === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FiBarChart2 className="mr-2" />
            Application Analytics
          </h3>
        </div>
        
        <div className="py-8 text-center text-gray-500">
          No application data available for the selected period.
          <div className="mt-4">
            <button
              onClick={() => handlePeriodChange('day')}
              className={`px-3 py-1 mr-2 rounded ${period === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              Today
            </button>
            <button
              onClick={() => handlePeriodChange('week')}
              className={`px-3 py-1 mr-2 rounded ${period === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              This Week
            </button>
            <button
              onClick={() => handlePeriodChange('month')}
              className={`px-3 py-1 rounded ${period === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              This Month
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <FiBarChart2 className="mr-2" />
          Application Analytics
        </h3>
        
        <div className="flex text-sm">
          <button
            onClick={() => handlePeriodChange('day')}
            className={`px-3 py-1 mr-2 rounded ${period === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            Today
          </button>
          <button
            onClick={() => handlePeriodChange('week')}
            className={`px-3 py-1 mr-2 rounded ${period === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            This Week
          </button>
          <button
            onClick={() => handlePeriodChange('month')}
            className={`px-3 py-1 rounded ${period === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            This Month
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-sm text-blue-700 font-semibold mb-1">Total Applications</div>
            <div className="text-3xl font-bold text-blue-800">{stats.totalJobsApplied}</div>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <div className="text-sm text-green-700 font-semibold mb-1">Automation Runs</div>
            <div className="text-3xl font-bold text-green-800">{stats.totalSessions}</div>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
            <div className="text-sm text-purple-700 font-semibold mb-1">Avg. Jobs per Run</div>
            <div className="text-3xl font-bold text-purple-800">
              {stats.totalSessions > 0 ? (stats.totalJobsApplied / stats.totalSessions).toFixed(1) : 0}
            </div>
          </div>
        </div>
        
        {/* Platform Distribution */}
        {stats.applicationsByPlatform && Object.keys(stats.applicationsByPlatform).length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <FiPieChart className="mr-1" /> Applications by Platform
            </h4>
            <div className="space-y-3">
              {Object.entries(stats.applicationsByPlatform).map(([platform, count]) => (
                <div key={platform} className="relative">
                  <div className="flex justify-between mb-1">
                    <span className="capitalize text-sm font-medium">{platform}</span>
                    <span className="text-sm text-gray-600">{count} jobs</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${(count / stats.totalJobsApplied) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Recent Sessions */}
        {stats.recentSessions && stats.recentSessions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <FiCalendar className="mr-1" /> Recent Automation Runs
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jobs</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentSessions.slice(0, 5).map((session) => (
                    <tr key={session.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm capitalize">{session.platform}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                        {new Date(session.session_start).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {session.jobs_applied} / {session.jobs_requested}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${session.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          session.status === 'started' ? 'bg-blue-100 text-blue-800' : 
                          'bg-red-100 text-red-800'}`}>
                          {session.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplicationAnalytics;
