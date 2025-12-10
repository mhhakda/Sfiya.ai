// pages/auth/signup.tsx - SIGN UP PAGE
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function SignUp() {
  const router = useRouter();
  const [step, setStep] = useState('signup'); // signup, verify-email, password
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    user_type: 'individual',
    otp: '',
    password: '',
    confirmPassword: ''
  });

  // Step 1: Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.full_name,
          user_type: formData.user_type
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('OTP sent to your email!');
      setStep('verify-email');
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Email & Create Password
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp,
          password: formData.password
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Save token
      localStorage.setItem('token', data.token);
      toast.success('Account created! Welcome to Sfiya.ai');
      
      // Redirect to dashboard
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-2">
            Sfiya.ai
          </h1>
          <p className="text-slate-400">AI-powered social media automation</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">
          {step === 'signup' ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>
              
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none transition"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none transition"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Account Type</label>
                  <select
                    value={formData.user_type}
                    onChange={(e) => setFormData({...formData, user_type: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-teal-500 focus:outline-none transition"
                  >
                    <option value="individual">Individual Creator</option>
                    <option value="agency">Agency/Consultant</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition disabled:opacity-50"
                >
                  {loading ? 'Sending OTP...' : 'Continue'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">Verify Email & Set Password</h2>
              <p className="text-slate-400 text-sm mb-6">We sent an OTP to {formData.email}</p>

              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">OTP Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={formData.otp}
                    onChange={(e) => setFormData({...formData, otp: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none transition text-center text-2xl tracking-widest"
                    placeholder="000000"
                  />
                  <p className="text-xs text-slate-400 mt-2">Check your email for the 6-digit code</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none transition"
                    placeholder="Min 8 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none transition"
                    placeholder="Confirm password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('signup')}
                  className="w-full py-2 border border-slate-600 text-slate-300 rounded-lg font-semibold hover:border-teal-500 hover:text-teal-400 transition"
                >
                  Back
                </button>
              </form>
            </>
          )}

          {/* Footer */}
          <p className="text-center text-slate-400 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-teal-400 hover:text-teal-300 font-semibold">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
