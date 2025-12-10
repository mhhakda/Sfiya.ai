// pages/index.tsx - LANDING PAGE
import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Zap, Shield, TrendingUp } from 'react-icons/fa';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
            Sfiya.ai
          </div>
          <div className="hidden md:flex gap-8 items-center">
            <a href="#features" className="text-slate-300 hover:text-white transition">Features</a>
            <a href="#pricing" className="text-slate-300 hover:text-white transition">Pricing</a>
            <a href="#faq" className="text-slate-300 hover:text-white transition">FAQ</a>
            <Link href="/auth/login">
              <button className="px-6 py-2 text-white hover:text-teal-400 transition">Login</button>
            </Link>
            <Link href="/auth/signup">
              <button className="px-6 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-teal-500/50 transition">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            AI-Powered Social Media
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500"> Automation</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Auto-reply to Instagram, YouTube, Facebook comments with AI. Customize brand voice, detect sales leads, and scale your engagement effortlessly.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth/signup">
              <button className="px-8 py-4 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-2xl hover:shadow-teal-500/50 transition text-lg">
                Start Free Trial
              </button>
            </Link>
            <button className="px-8 py-4 border-2 border-teal-500 text-teal-400 rounded-lg font-semibold hover:bg-teal-500/10 transition text-lg">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">Powerful Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-8 h-8 text-teal-400" />,
                title: 'AI Auto-Reply',
                desc: 'GPT-4 powered replies that match your brand voice across all platforms'
              },
              {
                icon: <Shield className="w-8 h-8 text-teal-400" />,
                title: 'Smart Filtering',
                desc: 'Sentiment analysis detects spam, hate comments, and sales leads automatically'
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-teal-400" />,
                title: 'Analytics Dashboard',
                desc: 'Track engagement metrics, reply performance, and growth trends in real-time'
              },
              {
                icon: <CheckCircle className="w-8 h-8 text-teal-400" />,
                title: 'Multi-Language',
                desc: 'Support for English, Hindi, Gujarati, Roman Hinglish, and more'
              },
              {
                icon: <Zap className="w-8 h-8 text-teal-400" />,
                title: 'Brand Customization',
                desc: 'Set tone, emojis, catchphrases, and personality to match your brand'
              },
              {
                icon: <Shield className="w-8 h-8 text-teal-400" />,
                title: 'Enterprise Security',
                desc: 'Bank-grade encryption, RLS policies, and GDPR compliant infrastructure'
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 bg-slate-700/50 border border-slate-600 rounded-xl hover:border-teal-500 transition">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-300">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">Simple, Transparent Pricing</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                name: 'Free',
                price: '₹0',
                replies: '100/mo',
                platforms: '1',
                features: ['Basic sentiment analysis', 'Fixed tones only', 'Limited languages']
              },
              {
                name: 'Creator',
                price: '₹2,399',
                replies: '5,000/mo',
                platforms: '5',
                features: ['All sentiment types', 'Custom brand voice', '5 languages', 'Auto-like positive comments'],
                popular: true
              },
              {
                name: 'Pro',
                price: '₹8,299',
                replies: '50,000/mo',
                platforms: '10',
                features: ['Everything in Creator', 'API access', 'Advanced analytics', 'Priority support']
              },
              {
                name: 'Enterprise',
                price: '₹24,999',
                replies: '500K/mo',
                platforms: '25+',
                features: ['Everything in Pro', 'Dedicated account', 'Custom integrations', 'SLA guarantee']
              }
            ].map((plan, i) => (
              <div 
                key={i} 
                className={`p-8 rounded-xl border transition ${
                  plan.popular 
                    ? 'border-teal-500 bg-slate-700/80 ring-2 ring-teal-500' 
                    : 'border-slate-600 bg-slate-700/50 hover:border-teal-500'
                }`}
              >
                {plan.popular && (
                  <div className="text-xs font-bold text-teal-400 mb-4 uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-teal-400 mb-1">{plan.price}</div>
                <p className="text-slate-400 text-sm mb-6">/month</p>
                
                <div className="mb-6 space-y-3 text-sm text-slate-300">
                  <p>💬 <strong>{plan.replies}</strong> AI replies</p>
                  <p>📱 <strong>{plan.platforms}</strong> platforms</p>
                </div>

                <Link href="/auth/signup">
                  <button className={`w-full py-2 rounded-lg font-semibold transition mb-6 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white hover:shadow-lg hover:shadow-teal-500/50'
                      : 'border border-teal-500 text-teal-400 hover:bg-teal-500/10'
                  }`}>
                    Get Started
                  </button>
                </Link>

                <ul className="space-y-2">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="text-slate-300 text-sm flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-teal-600 to-blue-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to automate your social media?</h2>
          <p className="text-lg text-teal-100 mb-8">Join creators and agencies already saving 10+ hours per week</p>
          <Link href="/auth/signup">
            <button className="px-8 py-4 bg-white text-teal-600 rounded-lg font-bold text-lg hover:shadow-2xl transition">
              Start Free Trial →
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-8 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <p className="text-slate-400">© 2025 Sfiya.ai. All rights reserved.</p>
          <div className="flex gap-6 text-slate-400">
            <a href="#" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">Terms</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
