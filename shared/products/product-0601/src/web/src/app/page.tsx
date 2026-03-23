export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="inline-block bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold mb-6">
            CMMC 2.0 Level 2 deadline: October 31, 2026
          </div>
          <h1 className="text-5xl font-bold mb-6">
            CMMC Compliance Without the Consultant Price Tag
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Automated gap assessment, SSP generation, POA&M creation, and C3PAO readiness scoring. Built for small defense contractors (1-50 employees).
          </p>
          <div className="flex gap-4 justify-center">
            <a href="/register" className="bg-white text-blue-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition">
              Start Free Assessment
            </a>
            <a href="/#features" className="border border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition">
              See How It Works
            </a>
          </div>
          <p className="text-sm text-blue-200 mt-4">Free gap assessment. No credit card required.</p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">The CMMC Problem for Small Contractors</h2>
          <div className="grid md:grid-cols-3 gap-8 mt-8">
            <div className="p-6">
              <div className="text-4xl font-bold text-red-600 mb-2">$75K-$130K</div>
              <p className="text-gray-600">Average first-year cost for CMMC compliance with consultants</p>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-red-600 mb-2">0.5%</div>
              <p className="text-gray-600">Of the Defense Industrial Base is currently certified</p>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-red-600 mb-2">200,000</div>
              <p className="text-gray-600">Companies that need certification by Oct 2026</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Everything You Need for CMMC Level 2</h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            From gap assessment to C3PAO readiness — one platform replaces $100K+ in consulting fees.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Gap Assessment', desc: 'Interactive questionnaire mapped to all 110 NIST SP 800-171 controls across 14 families.' },
              { title: 'SSP Generation', desc: 'Auto-generated System Security Plan from your assessment data. CMMC-compliant format.' },
              { title: 'POA&M Creator', desc: 'Plan of Action & Milestones for every identified gap with remediation guidance.' },
              { title: 'Readiness Score', desc: 'Real-time C3PAO readiness score. Know exactly where you stand before the audit.' },
              { title: 'Remediation Tracker', desc: 'Track progress on gap closure. Update statuses as you implement controls.' },
              { title: 'Control Library', desc: 'Complete NIST SP 800-171 control taxonomy with descriptions, questions, and hints.' },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Simple Pricing</h2>
          <p className="text-gray-500 text-center mb-12">Start with a free assessment. Upgrade when you are ready for SSP generation.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Starter', price: '$99', features: ['1 assessment/month', 'Basic SSP generation', 'Gap analysis report', 'Email support'] },
              { name: 'Pro', price: '$199', popular: true, features: ['Unlimited assessments', 'Full SSP + POA&M', 'Remediation tracking', 'Readiness scoring', 'Priority support'] },
              { name: 'Team', price: '$299', features: ['Everything in Pro', 'Up to 10 team members', 'Shared assessments', 'Audit collaboration', 'Dedicated support'] },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-xl p-6 ${plan.popular ? 'bg-blue-600 text-white ring-4 ring-blue-300' : 'bg-white border border-gray-200'}`}>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="my-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={plan.popular ? 'text-blue-200' : 'text-gray-500'}>/mo</span>
                </div>
                <ul className="space-y-2 mb-6 text-sm">
                  {plan.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                <a href={`/register?plan=${plan.name.toLowerCase()}`} className={`block text-center py-2 rounded-lg font-medium ${plan.popular ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-900 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Do not lose your DoD contracts.</h2>
          <p className="text-blue-200 mb-8">CMMC 2.0 Level 2 becomes mandatory for all new DoD contracts on October 31, 2026. Start your compliance journey today.</p>
          <a href="/register" className="inline-block bg-white text-blue-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50">
            Start Free Assessment
          </a>
        </div>
      </section>
    </div>
  );
}
