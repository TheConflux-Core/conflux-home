interface FamilyProgressBarProps {
  name: string;
  score: number;
}

export function FamilyProgressBar({ name, score }: FamilyProgressBarProps) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-4">
      <span className="w-48 text-sm font-medium text-gray-700 truncate">{name}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-12 text-sm font-semibold text-right">{score}%</span>
    </div>
  );
}
