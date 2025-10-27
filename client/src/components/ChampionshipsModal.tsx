import { X } from 'lucide-react';
import { ChampionBanner } from './ChampionBanner';

interface Championship {
  season: number;
  colors: string[];
  logo?: string;
  teamName: string;
  abbrev: string;
}

interface ChampionshipsModalProps {
  open: boolean;
  onClose: () => void;
  championships: Championship[];
  teamName: string;
}

export function ChampionshipsModal({
  open,
  onClose,
  championships,
  teamName
}: ChampionshipsModalProps) {
  if (!open) return null;

  const championshipCount = championships.length;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 110000,
        backdropFilter: 'blur(10px) brightness(0.8)',
        WebkitBackdropFilter: 'blur(10px) brightness(0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      {/* Championships Display Card */}
      <div
        className="relative w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-slate-900"
        style={{
          border: '2px solid rgba(255, 255, 255, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 rounded-full p-2 transition-all hover:scale-110 hover:rotate-90 bg-white/20"
          style={{
            color: '#ffffff',
          }}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="relative z-10 p-6 border-b border-white/20">
          <h2 className="text-3xl font-black tracking-tight text-white text-center">
            {teamName} {championshipCount}x {championshipCount === 1 ? 'Champion' : 'Champions'}
          </h2>
        </div>

        {/* Championships Grid - Scrollable */}
        <div className="relative z-10 flex-1 overflow-auto p-6">
          {championships.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/60 text-lg">No championship data available</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 justify-items-center">
              {championships.map((championship) => (
                <div key={championship.season} className="flex flex-col items-center">
                  <ChampionBanner
                    season={championship.season}
                    teamAbbrev={championship.abbrev}
                    teamColors={championship.colors}
                    teamLogo={championship.logo}
                    className="w-28"
                    inModal={true}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
