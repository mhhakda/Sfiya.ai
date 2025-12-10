// pages/dashboard/plans.tsx - PRICING & UPGRADE PAGE
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, Loader } from 'react-icons/fa';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    const userToken = localStorage.getItem('token');
    if (!userToken) {
      router.push('/auth/login');
      return;
    }
    setToken(userToken);

    fetchPlans();
    loadRazorpayScript();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/payments/plans');
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (error) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  };

  const handleUpgrade = async (planId: string) => {
    setProcessingPlan(planId);

    try {
      // Get user ID from token
      const decoded = JSON.parse(atob(token.split('.')[1]));

      // Create Razorpay order
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_id: planId,
          user_id: decoded.user_id
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      const { id: order_id, razorpay_key_id, amount, user_email, user_name } = orderData.order;

      // Open Razorpay checkout
      const options = {
        key: razorpay_key_id,
        amount: amount,
        currency: 'INR',
        name: 'Sfiya.ai',
        description: 'AI Social Media Automation',
        order_id: order_id,
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error);

            toast.success('🎉 Welcome to your new plan!');
            setTimeout(() => router.push('/dashboard'), 1500);
          } catch (error: any) {
            toast.error('Payment verification failed: ' + error.message);
          }
        },
        prefill: {
          email: user_email,
          name: user_name
        },
        theme: {
          color: '#14b8a6'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process upgrade');
    } finally {
      setProcessingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-4">Upgrade Your Plan</h1>
        <p className="text-center text-slate-400 mb-12">Choose the perfect plan for your business</p>

        <div className="grid md:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`p-8 rounded-xl border transition ${
                plan.name === 'Creator'
                  ? 'border-teal-500 bg-slate-700/80 ring-2 ring-teal-500'
                  : 'border-slate-600 bg-slate-700/50 hover:border-teal-500'
              }`}
            >
              {plan.name === 'Creator' && (
                <div className="text-xs font-bold text-teal-400 mb-4 uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="text-3xl font-bold text-teal-400 mb-6">₹{plan.price_inr}</div>

              <div className="mb-6 space-y-3 text-sm text-slate-300">
                <p>💬 {plan.auto_replies_per_month.toLocaleString()} replies/mo</p>
                <p>📱 {plan.max_platforms} platforms</p>
              </div>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={processingPlan === plan.id}
                className={`w-full py-2 rounded-lg font-semibold transition mb-6 ${
                  plan.name === 'Creator'
                    ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white hover:shadow-lg hover:shadow-teal-500/50 disabled:opacity-50'
                    : 'border border-teal-500 text-teal-400 hover:bg-teal-500/10 disabled:opacity-50'
                }`}
              >
                {processingPlan === plan.id ? (
                  <>
                    <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Upgrade Now'
                )}
              </button>

              <ul className="space-y-2">
                {plan.has_analytics && (
                  <li className="text-slate-300 text-sm flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    Analytics dashboard
                  </li>
                )}
                {plan.has_sentiment_analysis && (
                  <li className="text-slate-300 text-sm flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    Sentiment analysis
                  </li>
                )}
                {plan.has_auto_like && (
                  <li className="text-slate-300 text-sm flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    Auto-like comments
                  </li>
                )}
                {plan.has_brand_voice && (
                  <li className="text-slate-300 text-sm flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    Brand voice customization
                  </li>
                )}
                {plan.has_api_access && (
                  <li className="text-slate-300 text-sm flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    API access
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'Can I change plans anytime?',
                a: 'Yes! You can upgrade or downgrade your plan anytime. Changes take effect on your next billing cycle.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit/debit cards, UPI, and net banking through Razorpay.'
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes! Start with our free plan with 100 AI replies per month, no credit card required.'
              },
              {
                q: 'What happens if I cancel?',
                a: 'You can downgrade to the free plan anytime. Your data remains safe for 30 days.'
              }
            ].map((faq, i) => (
              <div key={i} className="p-6 bg-slate-700/50 border border-slate-600 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-slate-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
