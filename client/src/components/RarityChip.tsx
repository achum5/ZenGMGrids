export function RarityChip({ value }: { value: number }) {
  // Get color classes based on rarity value ranges
  const getColorClasses = (rarity: number): string => {
    if (rarity >= 1 && rarity <= 20) {
      return "bg-red-600 text-white";
    } else if (rarity >= 21 && rarity <= 40) {
      return "bg-orange-500 text-white";
    } else if (rarity >= 41 && rarity <= 60) {
      return "bg-yellow-400 text-black";
    } else if (rarity >= 61 && rarity <= 80) {
      return "bg-green-500 text-white";
    } else if (rarity >= 81 && rarity <= 100) {
      return "bg-indigo-600 text-white";
    } else {
      // Fallback for any edge cases
      return "bg-slate-900/90 text-white";
    }
  };

  return (
    <div
      className={`px-1 xs:px-1.5 py-0.5 rounded-md text-[9px] xs:text-[11px] sm:text-xs font-bold
                  shadow-lg border border-white/30 min-w-[1.25rem] xs:min-w-[1.5rem] 
                  flex items-center justify-center leading-none ${getColorClasses(value)}`}
      aria-label={`Rarity ${value}`}
      title={`Rarity ${value}`}
    >
      {value}
    </div>
  );
}