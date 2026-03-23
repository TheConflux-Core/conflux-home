export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Compliance Dashboard</h1>

      {/* Score Ring */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'C3PAO Readiness', value: '72%', color: 'text-yellow-600' },
          { label: 'Controls Assessed', value: '89/110', color: 'text-blue-600' },
          { label: 'Gaps Identified', value: '21', color: 'text-red-600' },
          { label: 'Remediated', value: '8', color: 'text-green-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Family Scores */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Control Family Scores</h2>
        <div className="space-y-3">
          {[
            { id: 'AC', name: 'Access Control', score: 78 },
            { id: 'IA', name: 'Identification & Authentication', score: 85 },
            { id: 'SC', name: 'System & Comms Protection', score: 65 },
            { id: 'AU', name: 'Audit & Accountability', score: 70 },
            { id: 'CM', name: 'Configuration Management', score: 60 },
            { id: 'IR', name: 'Incident Response', score: 55 },
            { id: 'SI', name: 'System & Info Integrity', score: 72 },
            { id: 'MP', name: 'Media Protection', score: 80 },
          ].map((fam) => (
            <div key={fam.id} className="flex items-center gap-4">
              <span className="w-48 text-sm font-medium">{fam.name}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${fam.score >= 80 ? 'bg-green-500' : fam.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${fam.score}%` }}
                />
              </div>
              <span className="w-12 text-sm font-semibold text-right">{fam.score}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a href="/assessment" className="block w-full text-center py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              Continue Assessment
            </a>
            <a href="/api/documents/ssp" className="block w-full text-center py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
              Generate SSP Document
            </a>
            <a href="/api/documents/poam" className="block w-full text-center py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
              Generate POA&M
            </a>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Gaps</h2>
          <div className="space-y-3">
            {[
              { id: 'SC-13', title: 'Cryptographic Protection (FIPS)', priority: 'high' },
              { id: 'IA-2(1)', title: 'Multi-Factor Authentication', priority: 'high' },
              { id: 'AU-9', title: 'Protection of Audit Information', priority: 'medium' },
              { id: 'CM-7', title: 'Least Functionality', priority: 'medium' },
            ].map((gap) => (
              <div key={gap.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-mono text-sm font-medium">{gap.id}</span>
                  <p className="text-sm text-gray-600">{gap.title}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${gap.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {gap.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
