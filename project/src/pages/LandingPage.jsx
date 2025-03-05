import { Link } from 'react-router-dom';
import { FiClock, FiTarget, FiTrendingUp, FiCheck, FiUser, FiBarChart } from 'react-icons/fi';

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold gradient-text">JobAutoPilot</h1>
            <div className="space-x-4">
              <Link to="/login" className="btn-secondary">Login</Link>
              <Link to="/register" className="btn-primary">Register</Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-6xl font-bold text-gray-900 mb-8 leading-tight">
              Your Job Search on <span className="gradient-text">Autopilot</span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              Let AI handle your job applications while you focus on what matters most. 
              Automate applications across multiple platforms and increase your chances of landing your dream job.
            </p>
            <Link to="/register" className="btn-primary text-lg px-10 py-4">
              Start Your Journey
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose JobAutoPilot?</h2>
              <p className="text-xl text-gray-600">Streamline your job search with powerful automation tools</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl shadow-md card-hover">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                  <FiClock className="text-blue-600 text-2xl" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Time Saving</h3>
                <p className="text-gray-600">Save countless hours by automating repetitive application processes</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-2xl shadow-md card-hover">
                <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                  <FiTarget className="text-indigo-600 text-2xl" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Smart Matching</h3>
                <p className="text-gray-600">AI-powered job matching ensures you apply to the most relevant positions</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl shadow-md card-hover">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                  <FiTrendingUp className="text-blue-600 text-2xl" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Higher Success Rate</h3>
                <p className="text-gray-600">Increase your chances of landing interviews with optimized applications</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-br from-gray-50 to-white py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="p-8">
                <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
                <div className="text-gray-600">Applications Automated Daily</div>
              </div>
              <div className="p-8">
                <div className="text-4xl font-bold text-blue-600 mb-2">85%</div>
                <div className="text-gray-600">Time Saved Per Application</div>
              </div>
              <div className="p-8">
                <div className="text-4xl font-bold text-blue-600 mb-2">50k+</div>
                <div className="text-gray-600">Happy Users</div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Benefits of Automation</h2>
              <p className="text-xl text-gray-600">Transform your job search experience</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start space-x-4 p-6 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FiCheck className="text-blue-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Automated Applications</h3>
                  <p className="text-gray-600">Apply to multiple jobs across different platforms with a single click</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-6 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FiUser className="text-blue-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Personalized Matching</h3>
                  <p className="text-gray-600">Get matched with jobs that align with your skills and preferences</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-6 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FiBarChart className="text-blue-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Progress Tracking</h3>
                  <p className="text-gray-600">Monitor your application status and success rate in real-time</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-6 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FiTrendingUp className="text-blue-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Enhanced Success</h3>
                  <p className="text-gray-600">Improve your chances of getting interviews with optimized applications</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-8">Ready to Transform Your Job Search?</h2>
            <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
              Join thousands of job seekers who have already simplified their job search process with JobAutoPilot
            </p>
            <Link to="/register" className="bg-white text-blue-600 px-10 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors">
              Get Started Now
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600">© 2024 JobAutoPilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;