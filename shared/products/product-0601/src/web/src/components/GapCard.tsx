interface GapCardProps {
  controlId: string;
  title: string;
  family: string;
  priority: 'high' | 'medium' | 'low';
  status: 'not_implemented' | 'partial';
  remediation: string;
}

export function GapCard({ controlId, title, family, priority, status, remediation }: GapCardProps) {
  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-semibold text-gray-900">{controlId}</span>
            <span className="text-xs text-gray-400">{family}</span>
          </div>
          <p className="text-sm font-medium text-gray-700">{title}</p>
          <p className="text-xs text-gray-500 mt-1">{remediation}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${priorityColors[priority]}`}>
          {priority}
        </span>
      </div>
    </div>
  );
}
