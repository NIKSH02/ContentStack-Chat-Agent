import React, { useState, useEffect } from 'react';

interface AnalyticsData {
  totalRequests: number;
  avgResponseTime: number;
  successRate: number;
  activeUsers: number;
  topTools: Array<{ name: string; count: number }>;
  recentActivity: Array<{ timestamp: string; action: string; status: 'success' | 'error' }>;
}

export const AnalyticsPage: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    // Simulate data fetching
    const fetchAnalytics = async () => {
      setLoading(true);
      // Mock data - replace with actual API call
      setTimeout(() => {
        setAnalyticsData({
          totalRequests: 2847,
          avgResponseTime: 2.3,
          successRate: 98.2,
          activeUsers: 42,
          topTools: [
            { name: 'get_entries', count: 1203 },
            { name: 'search_content', count: 892 },
            { name: 'publish_entry', count: 456 },
            { name: 'update_asset', count: 234 },
            { name: 'create_entry', count: 178 }
          ],
          recentActivity: [
            { timestamp: '2025-01-08T14:30:00Z', action: 'Search entries for "product launch"', status: 'success' },
            { timestamp: '2025-01-08T14:28:00Z', action: 'Update entry metadata', status: 'success' },
            { timestamp: '2025-01-08T14:25:00Z', action: 'Publish multiple entries', status: 'error' },
            { timestamp: '2025-01-08T14:22:00Z', action: 'Create new asset folder', status: 'success' },
            { timestamp: '2025-01-08T14:20:00Z', action: 'Query content type schema', status: 'success' }
          ]
        });
        setLoading(false);
      }, 1000);
    };

    fetchAnalytics();
  }, [timeRange]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Analytics
                </span>
              </h1>
              <p className="text-gray-600">Monitor your ContentStack AI assistant performance and usage</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <span className="text-sm text-green-600 font-medium">↗ +12.5%</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {analyticsData?.totalRequests.toLocaleString()}
            </div>
            <div className="text-gray-600 text-sm">Total Requests</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm text-green-600 font-medium">↗ -0.3s</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {analyticsData?.avgResponseTime}s
            </div>
            <div className="text-gray-600 text-sm">Avg Response Time</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm text-green-600 font-medium">↗ +1.2%</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {analyticsData?.successRate}%
            </div>
            <div className="text-gray-600 text-sm">Success Rate</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <span className="text-sm text-green-600 font-medium">↗ +8</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {analyticsData?.activeUsers}
            </div>
            <div className="text-gray-600 text-sm">Active Users</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Top Tools */}
          <div className="bg-white rounded-2xl shadow-lg border p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Most Used Tools</h2>
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
            
            <div className="space-y-4">
              {analyticsData?.topTools.map((tool, index) => (
                <div key={tool.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-medium text-gray-600">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{tool.name}</div>
                      <div className="text-sm text-gray-600">{tool.count} uses</div>
                    </div>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ 
                        width: `${(tool.count / analyticsData.topTools[0].count) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-lg border p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Recent Activity</h2>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <div className="space-y-4">
              {analyticsData?.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                    activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div className="flex-1">
                    <div className="text-gray-900 font-medium">{activity.action}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatTime(activity.timestamp)}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'success' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {activity.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Chart Placeholder */}
        <div className="mt-8">
          <div className="bg-white rounded-2xl shadow-lg border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Performance Over Time</h2>
            <div className="h-64 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-500 font-medium">Interactive charts coming soon</p>
                <p className="text-gray-400 text-sm">Real-time performance visualization</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};