import { useState, useEffect } from 'react';
import { Grid3x3, Users, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

type GameMode = 'grids' | 'team-trivia' | 'higher-or-lower';

interface ChooseGameModeProps {
  onSelectMode: (mode: GameMode) => void;
  onBackToUpload: () => void;
}

export default function ChooseGameMode({ onSelectMode, onBackToUpload }: ChooseGameModeProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  // Load last selected mode from localStorage
  useEffect(() => {
    const lastMode = localStorage.getItem('lastGameMode') as GameMode | null;
    if (lastMode === 'grids' || lastMode === 'team-trivia' || lastMode === 'higher-or-lower') {
      setSelectedMode(lastMode);
    } else {
      // Default to grids if no preference
      setSelectedMode('grids');
    }
  }, []);

  const handleSelectMode = (mode: GameMode) => {
    setSelectedMode(mode);
  };

  const handleStart = () => {
    if (selectedMode) {
      localStorage.setItem('lastGameMode', selectedMode);
      onSelectMode(selectedMode);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const modes: GameMode[] = ['grids', 'team-trivia', 'higher-or-lower'];
      const currentIndex = selectedMode ? modes.indexOf(selectedMode) : 0;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMode(modes[(currentIndex - 1 + modes.length) % modes.length]);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMode(modes[(currentIndex + 1) % modes.length]);
      } else if (e.key === 'Enter' && selectedMode) {
        e.preventDefault();
        handleStart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMode]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <div className="w-full max-w-4xl space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Choose Your Game
          </h1>
          <p className="text-muted-foreground text-lg">
            Select a game mode to play with your league
          </p>
        </div>

        {/* Mode Cards */}
        <div 
          className="grid md:grid-cols-3 gap-6"
          role="radiogroup"
          aria-label="Game mode selection"
        >
          {/* Grids Card */}
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedMode === 'grids'
                ? 'ring-2 ring-primary shadow-lg scale-[1.02]'
                : 'hover:scale-[1.01]'
            }`}
            onClick={() => handleSelectMode('grids')}
            data-testid="card-mode-grids"
            role="radio"
            aria-checked={selectedMode === 'grids'}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectMode('grids');
              }
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-center gap-3">
                <div className={`p-3 rounded-lg ${
                  selectedMode === 'grids'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <Grid3x3 className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Grids</CardTitle>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Team Trivia Card */}
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedMode === 'team-trivia'
                ? 'ring-2 ring-primary shadow-lg scale-[1.02]'
                : 'hover:scale-[1.01]'
            }`}
            onClick={() => handleSelectMode('team-trivia')}
            data-testid="card-mode-team-trivia"
            role="radio"
            aria-checked={selectedMode === 'team-trivia'}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectMode('team-trivia');
              }
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-center gap-3">
                <div className={`p-3 rounded-lg ${
                  selectedMode === 'team-trivia'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <Users className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Team Trivia</CardTitle>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Higher or Lower Card */}
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedMode === 'higher-or-lower'
                ? 'ring-2 ring-primary shadow-lg scale-[1.02]'
                : 'hover:scale-[1.01]'
            }`}
            onClick={() => handleSelectMode('higher-or-lower')}
            data-testid="card-mode-higher-or-lower"
            role="radio"
            aria-checked={selectedMode === 'higher-or-lower'}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectMode('higher-or-lower');
              }
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-center gap-3">
                <div className={`p-3 rounded-lg ${
                  selectedMode === 'higher-or-lower'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <ArrowUpDown className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Higher or Lower</CardTitle>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={handleStart}
            disabled={!selectedMode}
            className="w-full sm:w-auto text-lg px-8 py-6"
            data-testid="button-start-game"
          >
            {selectedMode === 'grids' ? 'Start Grids' : selectedMode === 'team-trivia' ? 'Start Team Trivia' : 'Start Higher or Lower'}
          </Button>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={onBackToUpload}
            className="w-full sm:w-auto"
            data-testid="link-back-to-upload"
          >
            Back to Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
