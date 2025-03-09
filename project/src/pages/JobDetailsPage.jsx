import { useState, useEffect } from 'react';
import { FiDownload, FiFilter, FiInfo, FiExternalLink, FiSearch, FiCalendar } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../lib/supabaseClient';

function JobDetailsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchAppliedJobs = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data, error } = await subscriptionService.getAppliedJobs(user.id);
        
        if (error) {
          console.error('Error fetching applied jobs:', error);
        } else {
          setJobs(data || []);
        }
      } catch (err) {
        console.error('Error in fetchAppliedJobs:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAppliedJobs();
  }, [user]);

  // Filter jobs by platform
  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true;
    return job.platform === filter;
  }).filter(job => {
    if (!search) return true;
    return (
      job.job_title?.toLowerCase().includes(search.toLowerCase()) ||
      job.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      job.job_location?.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Get unique platforms
  const platforms = [...new Set(jobs.map(job => job.platform))];

  // Format date for display
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

  const handleExportCsv = () => {
    // Create CSV content
    const headers = ['Job Title', 'Company', 'Location', 'Platform', 'Date Applied', 'Status'];
    const rows = filteredJobs.map(job => [
      job.job_title || '',
      job.company_name || '',
      job.job_location || '',
      job.platform || '',
      job.date_applied ? formatDate(job.date_applied) : '',
      job.application_status || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `applied_jobs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Applied Jobs</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Job Applications</h2>
            
            <div className="flex flex-wrap gap-4 mt-4 md:mt-0">
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="block appearance-none bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Platforms</option>
                  {platforms.map(platform => (
                    <option key={platform} value={platform}>{platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Unknown'}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <FiFilter />
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search jobs..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              
              <button 
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={handleExportCsv}
              >
                <FiDownload className="mr-2" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
          
          <div className="mt-2 text-sm text-gray-500 flex items-center">
            <FiCalendar className="mr-2" />
            <span>Showing {filteredJobs.length} job applications</span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading job applications...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="mb-4">
              <FiInfo className="mx-auto h-12 w-12 text-gray-400" />
            </div>
            <p className="text-lg font-medium">No job applications found</p>
            <p className="mt-1">Start applying to jobs to see your applications here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Applied</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{job.job_title || 'Untitled Job'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{job.company_name || 'Unknown Company'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{job.job_location || 'No location data'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlatformColor(job.platform)}`}>
                        {job.platform ? job.platform.charAt(0).toUpperCase() + job.platform.slice(1) : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.date_applied ? formatDate(job.date_applied) : 'No date'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {job.application_status || 'Applied'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {job.job_url && (
                        <a 
                          href={job.job_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 flex items-center justify-end"
                        >
                          <span className="mr-1">View</span>
                          <FiExternalLink size={14} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default JobDetailsPage;
