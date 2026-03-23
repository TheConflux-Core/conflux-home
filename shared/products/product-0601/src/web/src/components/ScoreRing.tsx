interface ScoreRingProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreRing({ score, label, size = 'md' }: ScoreRingProps) {
  const dimensions = { sm: 'w-20 h-20', md: 'w-32 h-32', lg: 'w-40 h-40' };
  const textSizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' };
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="flex flex-col items-center">
      <div
        className={`${dimensions[size]} rounded-full compliance-ring flex items-center justify-center`}
        style={{ '--score': score } as React.CSSProperties}
      >
        <div className="bg-white rounded-full w-[85%] h-[85%] flex items-center justify-center">
          <span className={`${textSizes[size]} font-bold ${color}`}>{score}%</span>
        </div>
      </div>
      <span className="text-sm text-gray-500 mt-2">{label}</span>
    </div>
  );
}
