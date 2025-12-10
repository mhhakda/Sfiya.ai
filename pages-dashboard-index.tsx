// pages/dashboard/index.tsx - USER DASHBOARD
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { LogOut, Settings, CreditCard, BarChart3, Plus } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    fetchUserData(token);
  }, []);

  const fetchUserData = async (token: string) => {
    try {
      // In Phase 2, create a GET /api/user endpoint
      // For now, decode token to get user info
      const decoded = JSON.parse(atob(token.split('.')[1]));
      setUser({
        email: decoded.email,
        user_id: decoded.user_id,
      });

      // Fetch subscription
      const res = await fetch('/api/payments/subscription', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.subscription) {
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Top Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
            Sfiya.ai
          </h1>
          <div className="flex gap-4 items-center">
            <button className="p-2 text-slate-300 hover:text-white transition">
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-300 hover:text-white transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-white mb-2">Welcome back! 👋</h2>
          <p className="text-slate-400">{user?.email}</p>
        </div>

        {/* Current Plan */}
        {subscription ? (
          <div className="mb-12 p-8 bg-gradient-to-br from-teal-600 to-blue-600 rounded-xl">
            <h3 className="text-2xl font-bold text-white mb-4">Current Plan</h3>
            <div className="grid md:grid-cols-3 gap-6 text-white">
              <div>
                <p className="text-teal-100 text-sm">Plan</p>
                <p className="text-2xl font-bold">{subscription.plan_name}</p>
              </div>
              <div>
                <p className="text-teal-100 text-sm">Status</p>
                <p className="text-2xl font-bold capitalize">{subscription.subscription_status}</p>
              </div>
              <div>
                <p className="text-teal-100 text-sm">Renewal Date</p>
                <p className="text-2xl font-bold">
                  {new Date(subscription.renewal_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Link href="/dashboard/subscription">
                <button className="px-6 py-2 bg-white text-teal-600 rounded-lg font-semibold hover:shadow-lg transition">
                  Manage Plan
                </button>
              </Link>
              <button className="px-6 py-2 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition">
                Cancel Plan
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-12 p-8 bg-slate-700 rounded-xl border-2 border-dashed border-teal-500">
            <h3 className="text-2xl font-bold text-white mb-4">Upgrade Your Plan</h3>
            <p className="text-slate-300 mb-6">You're currently on the Free plan. Upgrade to unlock powerful features!</p>
            <Link href="/dashboard/plans">
              <button className="px-6 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition">
                View Plans
              </button>
            </Link>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'AI Replies Sent', value: '0', icon: '💬' },
            { label: 'Comments Analyzed', value: '0', icon: '📊' },
            { label: 'Sales Leads Found', value: '0', icon: '🎯' },
            { label: 'Connected Accounts', value: '0', icon: '📱' }
          ].map((stat, i) => (
            <div key={i} className="p-6 bg-slate-700 rounded-xl border border-slate-600">
              <p className="text-3xl mb-2">{stat.icon}</p>
              <p className="text-slate-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Menu Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: 'Connected Accounts',
              desc: 'Manage your Instagram, YouTube, and Facebook accounts',
              icon: <Plus className="w-6 h-6" />,
              href: '/dashboard/accounts',
              color: 'from-pink-600 to-red-600'
            },
            {
              title: 'Settings',
              desc: 'Configure AI tone, language, and brand voice',
              icon: <Settings className="w-6 h-6" />,
              href: '/dashboard/settings',
              color: 'from-blue-600 to-cyan-600'
            },
            {
              title: 'Analytics',
              desc: 'Track replies, engagement, and performance metrics',
              icon: <BarChart3 className="w-6 h-6" />,
              href: '/dashboard/analytics',
              color: 'from-emerald-600 to-teal-600'
            }
          ].map((card, i) => (
            <Link key={i} href={card.href}>
              <div className={`p-8 bg-gradient-to-br ${card.color} rounded-xl cursor-pointer hover:shadow-2xl transition`}>
                <div className="text-white mb-4">{card.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                <p className="text-white/80">{card.desc}</p>
                <p className="text-white/60 text-sm mt-4">→ Get started</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
