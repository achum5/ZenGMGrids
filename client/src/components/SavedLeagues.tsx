import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Download, Edit2, Check, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { getAllLeagues, deleteLeague, updateLeagueName, formatFileSize, formatDate, type StoredLeague } from '@/lib/league-storage';
import basketballIcon from '@/assets/zengm-grids-logo-basketball.png';
import footballIcon from '@/assets/zengm-grids-logo-football.png';
import hockeyIcon from '@/assets/zengm-grids-logo-hockey.png';
import baseballIcon from '@/assets/zengm-grids-logo-baseball.png';

interface SavedLeaguesProps {
  onLoadLeague: (league: StoredLeague) => void;
}

export function SavedLeagues({ onLoadLeague }: SavedLeaguesProps) {
  const [leagues, setLeagues] = useState<StoredLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const loadLeagues = async () => {
    setLoading(true);
    try {
      const allLeagues = await getAllLeagues();
      setLeagues(allLeagues);
    } catch (error) {
      console.error('Error loading leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeagues();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteLeague(id);
      await loadLeagues();
    } catch (error) {
      console.error('Error deleting league:', error);
    }
  };

  const handleStartEdit = (league: StoredLeague) => {
    setEditingId(league.id);
    setEditName(league.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (editName.trim()) {
      try {
        await updateLeagueName(id, editName.trim());
        await loadLeagues();
      } catch (error) {
        console.error('Error updating league name:', error);
      }
    }
    setEditingId(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'basketball': return basketballIcon;
      case 'football': return footballIcon;
      case 'hockey': return hockeyIcon;
      case 'baseball': return baseballIcon;
      default: return basketballIcon;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading saved leagues...
      </div>
    );
  }

  if (leagues.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No saved leagues yet.</p>
        <p className="text-sm mt-2">Upload a league file to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold mb-4">Your Saved Leagues</h3>
      {leagues.map((league) => (
        <Card key={league.id} className="p-4 hover:bg-accent/50 transition-colors" data-testid={`league-card-${league.id}`}>
          <div className="flex items-start gap-4">
            <img 
              src={getSportIcon(league.sport)} 
              alt={league.sport}
              className="w-12 h-12 object-contain"
              data-testid={`league-sport-icon-${league.id}`}
            />
            
            <div className="flex-1 min-w-0">
              {editingId === league.id ? (
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(league.id);
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    data-testid="input-edit-league-name"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSaveEdit(league.id)}
                    data-testid="button-save-edit"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    data-testid="button-cancel-edit"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold truncate" data-testid={`text-league-name-${league.id}`}>
                    {league.name}
                  </h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStartEdit(league)}
                    className="h-6 w-6 p-0"
                    data-testid={`button-edit-${league.id}`}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
              
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span data-testid={`text-league-players-${league.id}`}>
                  {league.numPlayers?.toLocaleString()} players
                </span>
                <span data-testid={`text-league-teams-${league.id}`}>
                  {league.numTeams} teams
                </span>
                {league.seasons && (
                  <span data-testid={`text-league-seasons-${league.id}`}>
                    {league.seasons.min}–{league.seasons.max}
                  </span>
                )}
                {league.fileSize && (
                  <span data-testid={`text-league-size-${league.id}`}>
                    {formatFileSize(league.fileSize)}
                  </span>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground mt-1" data-testid={`text-league-date-${league.id}`}>
                Saved {formatDate(league.savedAt)}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onLoadLeague(league)}
                data-testid={`button-load-${league.id}`}
              >
                <Download className="w-4 h-4 mr-2" />
                Load
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    data-testid={`button-delete-trigger-${league.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete League</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{league.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(league.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid={`button-delete-confirm-${league.id}`}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
