import { useNavigate } from 'react-router-dom';
import { FiLinkedin, FiBriefcase, FiAward, FiBookOpen } from 'react-icons/fi';
import SubscriptionStatus from '../components/SubscriptionStatus';

function AutomatePage() {
  const navigate = useNavigate();

  const platforms = [
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: FiLinkedin,
      color: 'from-blue-500 to-blue-600',
      description: 'Automate job applications on LinkedIn with smart matching'
    },
    {
      id: 'indeed',
      name: 'Indeed',
      icon: FiBriefcase,
      color: 'from-indigo-500 to-indigo-600',
      description: 'Streamline your Indeed job search with automated applications'
    },
    {
      id: 'unstop',
      name: 'Unstop',
      icon: FiAward,
      color: 'from-blue-600 to-indigo-700',
      description: 'Maximize your opportunities on Unstop with automation'
    },
    {
      id: 'internshala',
      name: 'Internshala',
      icon: FiBookOpen,
      color: 'from-green-500 to-green-600',
      description: 'Find and apply to internships automatically on Internshala'
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <SubscriptionStatus />
      </div>
    
      <h2 className="text-3xl font-bold mb-2">Choose Platform to Automate</h2>
      <p className="text-gray-600 mb-8">Select a platform to start automating your job applications</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {platforms.map((platform) => (
          <div key={platform.id} className="bg-white rounded-xl shadow-md overflow-hidden card-hover">
            <div className={`bg-gradient-to-r ${platform.color} p-6 text-white`}>
              <platform.icon size={40} />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-3">{platform.name}</h3>
              <p className="text-gray-600 mb-6">{platform.description}</p>
              <button
                onClick={() => navigate(`/dashboard/automate/${platform.id}`)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <span>Start Automation</span>
                <platform.icon size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AutomatePage;