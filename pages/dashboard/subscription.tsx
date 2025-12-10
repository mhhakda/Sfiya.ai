// pages/dashboard/subscription.tsx - SUBSCRIPTION MANAGEMENT
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AlertCircle, CheckCircle, Calendar } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const userToken = localStorage.getItem('token');
    if (!userToken) {
      router.push('/auth/login');
      return;
    }
    setToken(userToken);
    fetchSubscription(userToken);
  }, []);

  const fetchSubscription = async (userToken: string) => {
    try {
      const res = await fetch('/api/payments/subscription', {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      const data = await res.json();
      setSubscription(data.subscription);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure? You will lose access to premium features.')) {
      return;
    }

    setCancellingSubscription(true);

    try {
      const res = await fetch('/api/payments/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription_id: subscription.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Subscription cancelled. You will be downgraded to Free plan.');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCancellingSubscription(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="p-8 bg-slate-700 border border-slate-600 rounded-xl">
            <h1 className="text-3xl font-bold text-white mb-4">No Active Subscription</h1>
            <p className="text-slate-400 mb-6">
              You're currently on the Free plan. Upgrade to unlock powerful features!
            </p>
            <button
              onClick={() => router.push('/dashboard/plans')}
              className="px-6 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition"
            >
              View Plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Subscription Settings</h1>

        {/* Current Plan */}
        <div className="mb-8 p-8 bg-gradient-to-br from-teal-600 to-blue-600 rounded-xl">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{subscription.plan_name} Plan</h2>
              <p className="text-teal-100">You have access to all premium features</p>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-lg">
              <p className="text-white capitalize font-semibold text-sm">
                {subscription.subscription_status}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-teal-100 text-sm">Started</p>
              <p className="text-white font-semibold">
                {new Date(subscription.start_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-teal-100 text-sm">Next Renewal</p>
              <p className="text-white font-semibold">
                {new Date(subscription.renewal_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Billing Information */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 bg-slate-700 border border-slate-600 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-400" />
              Billing Cycle
            </h3>
            <p className="text-slate-300 mb-2">Monthly</p>
            <p className="text-slate-400 text-sm">Renews on {new Date(subscription.renewal_date).toLocaleDateString()}</p>
          </div>

          <div className="p-6 bg-slate-700 border border-slate-600 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-teal-400" />
              Auto-Renewal
            </h3>
            <p className="text-slate-300 mb-2">{subscription.auto_renew ? 'Enabled' : 'Disabled'}</p>
            <p className="text-slate-400 text-sm">
              {subscription.auto_renew
                ? 'Your plan will renew automatically'
                : 'Your plan will expire on renewal date'}
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="p-6 bg-slate-700 border border-slate-600 rounded-xl mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Included Features</h3>
          <ul className="space-y-3">
            {[
              '💬 AI-powered auto-replies',
              '📊 Sentiment analysis',
              '🎯 Sales lead detection',
              '🎨 Brand voice customization',
              '📱 Multiple platform support',
              '📈 Advanced analytics',
              '⚙️ API access',
              '🔗 Webhook integrations'
            ].map((feature, i) => (
              <li key={i} className="text-slate-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-400" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => router.push('/dashboard/plans')}
            className="px-6 py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition"
          >
            Upgrade Plan
          </button>
          <button
            onClick={handleCancelSubscription}
            disabled={cancellingSubscription}
            className="px-6 py-3 border-2 border-red-500 text-red-400 rounded-lg font-semibold hover:bg-red-500/10 transition disabled:opacity-50"
          >
            {cancellingSubscription ? 'Cancelling...' : 'Cancel Subscription'}
          </button>
        </div>

        {/* Notice */}
        <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-4">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h4 className="text-white font-semibold mb-1">Need Help?</h4>
            <p className="text-slate-300">
              If you have questions about your subscription, please contact our support team at{' '}
              <a href="mailto:support@sfiya.ai" className="text-teal-400 hover:text-teal-300">
                support@sfiya.ai
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
