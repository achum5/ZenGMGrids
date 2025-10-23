import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Download, Edit2, Check, X, Info, Star, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useToast } from '@/lib/hooks/use-toast';
import { getAllLeagues, deleteLeague, updateLeagueName, bulkDeleteLeagues, toggleLeagueStarred, formatFileSize, formatDate, type StoredLeague } from '@/lib/league-storage';
import { BulkDeleteModal } from '@/components/BulkDeleteModal';
import basketballIcon from '@/assets/zengm-grids-logo-basketball.png';
import footballIcon from '@/assets/zengm-grids-logo-football.png';
import hockeyIcon from '@/assets/zengm-grids-logo-hockey.png';
import baseballIcon from '@/assets/zengm-grids-logo-baseball.png';

interface SavedLeaguesProps {
  onLoadLeague: (league: StoredLeague) => void;
  loadingLeagueId?: string | null;
  uploadProgress?: {
    message: string;
    loaded?: number;
    total?: number;
  } | null;
}

export function SavedLeagues({ onLoadLeague, loadingLeagueId, uploadProgress }: SavedLeaguesProps) {
  const [leagues, setLeagues] = useState<StoredLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ id: string; action: 'star' | 'delete' | 'rename' } | null>(null);
  const { toast } = useToast();

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
    setActionLoading({ id, action: 'delete' });
    try {
      // Optimistically remove from UI
      setLeagues(prev => prev.filter(l => l.id !== id));
      // Delete in background
      await deleteLeague(id);
    } catch (error) {
      console.error('Error deleting league:', error);
      // On error, reload to restore correct state
      await loadLeagues();
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartEdit = (league: StoredLeague) => {
    setEditingId(league.id);
    setEditName(league.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (editName.trim()) {
      setActionLoading({ id, action: 'rename' });
      try {
        // Optimistically update UI
        setLeagues(prev => prev.map(l =>
          l.id === id ? { ...l, name: editName.trim() } : l
        ));
        setEditingId(null);
        setEditName('');
        // Update in background
        await updateLeagueName(id, editName.trim());
      } catch (error) {
        console.error('Error updating league name:', error);
        // On error, reload to restore correct state
        await loadLeagues();
      } finally {
        setActionLoading(null);
      }
    } else {
      setEditingId(null);
      setEditName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleToggleStar = async (id: string) => {
    setActionLoading({ id, action: 'star' });
    try {
      // Optimistically update UI
      setLeagues(prev => prev.map(l =>
        l.id === id ? { ...l, starred: !l.starred } : l
      ));
      // Update in background
      await toggleLeagueStarred(id);
    } catch (error) {
      console.error('Error toggling star:', error);
      // On error, reload to restore correct state
      await loadLeagues();
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDelete = async (unstarredOnly: boolean) => {
    const leaguesToDelete = unstarredOnly
      ? leagues.filter(league => !league.starred)
      : leagues;

    if (leaguesToDelete.length === 0) {
      toast({
        title: 'No leagues to delete',
        description: unstarredOnly
          ? 'All your leagues are starred.'
          : 'You have no saved leagues.',
        variant: 'default',
      });
      return;
    }

    const ids = leaguesToDelete.map(l => l.id);
    const deletedCount = ids.length;

    try {
      // Optimistically remove from UI
      setLeagues(prev => prev.filter(l => !ids.includes(l.id)));

      // Delete in background
      await bulkDeleteLeagues(ids);

      toast({
        title: 'Leagues deleted',
        description: `Deleted ${deletedCount} league${deletedCount !== 1 ? 's' : ''}.`,
      });
    } catch (error) {
      console.error('Error deleting leagues:', error);
      // On error, reload to restore correct state
      await loadLeagues();
      toast({
        title: 'Error',
        description: 'Failed to delete leagues. Please try again.',
        variant: 'destructive',
      });
    }
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

  const unstarredCount = leagues.filter(l => !l.starred).length;

  return (
    <div className="space-y-2">
      {/* Header with title and Delete All button */}
      <div className="flex items-center justify-between mt-[7px] mb-[7px]">
        <h3 className="text-lg font-semibold">Your Saved Leagues</h3>
        {leagues.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowBulkDeleteModal(true)}
            className="h-7 text-red-400 hover:text-red-300 hover:bg-red-400/10"
            aria-label="Delete all leagues"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete All
          </Button>
        )}
      </div>

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        open={showBulkDeleteModal}
        onOpenChange={setShowBulkDeleteModal}
        onConfirm={handleBulkDelete}
        totalCount={leagues.length}
        unstarredCount={unstarredCount}
      />

      {leagues.map((league) => (
        <Card key={league.id} className="p-2 hover:bg-accent/50 transition-colors" data-testid={`league-card-${league.id}`}>
          {/* Main compact row */}
          <div className="flex items-center gap-2 min-h-[32px]">
            {/* Sport Icon - smaller */}
            <img
              src={getSportIcon(league.sport)}
              alt={league.sport}
              className="w-6 h-6 flex-shrink-0 object-contain"
              data-testid={`league-sport-icon-${league.id}`}
            />

            {/* League Name or Edit Input */}
            {editingId === league.id ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-sm"
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
                  className="h-7 w-7 p-0 flex-shrink-0"
                  data-testid="button-save-edit"
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="h-7 w-7 p-0 flex-shrink-0"
                  data-testid="button-cancel-edit"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <>
                {/* League info - minimal: name, years, size */}
                <div className="flex-1 min-w-0 flex items-center gap-2 text-sm overflow-hidden">
                  <span className="font-semibold truncate" data-testid={`text-league-name-${league.id}`}>
                    {league.name}
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground flex-shrink-0 whitespace-nowrap text-xs">
                    {league.seasons && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span data-testid={`text-league-seasons-${league.id}`}>
                          {league.seasons.min}–{league.seasons.max}
                        </span>
                      </>
                    )}
                    {league.fileSize && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span data-testid={`text-league-size-${league.id}`}>
                          {formatFileSize(league.fileSize)}
                        </span>
                      </>
                    )}
                  </span>
                </div>

                {/* Action buttons - compact */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Info popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        data-testid={`button-info-${league.id}`}
                      >
                        <Info className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 text-sm" align="end">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">{league.name}</h4>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Players:</span>
                            <span className="font-medium" data-testid={`text-league-players-${league.id}`}>
                              {league.numPlayers?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Teams:</span>
                            <span className="font-medium" data-testid={`text-league-teams-${league.id}`}>
                              {league.numTeams}
                            </span>
                          </div>
                          {league.seasons && (
                            <div className="flex justify-between">
                              <span>Seasons:</span>
                              <span className="font-medium" data-testid={`text-league-seasons-${league.id}-popup`}>
                                {league.seasons.min}–{league.seasons.max}
                              </span>
                            </div>
                          )}
                          {league.fileSize && (
                            <div className="flex justify-between">
                              <span>File Size:</span>
                              <span className="font-medium" data-testid={`text-league-size-${league.id}-popup`}>
                                {formatFileSize(league.fileSize)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Saved:</span>
                            <span className="font-medium" data-testid={`text-league-date-${league.id}`}>
                              {formatDate(league.savedAt)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sport:</span>
                            <span className="font-medium capitalize">
                              {league.sport}
                            </span>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Star/Unstar button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleStar(league.id)}
                    className="h-7 w-7 p-0"
                    data-testid={`button-star-${league.id}`}
                    aria-label={league.starred ? 'Unstar league' : 'Star league'}
                    disabled={actionLoading?.id === league.id && actionLoading?.action === 'star'}
                  >
                    {actionLoading?.id === league.id && actionLoading?.action === 'star' ? (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    ) : (
                      <Star
                        className={`w-3 h-3 ${
                          league.starred
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStartEdit(league)}
                    className="h-7 w-7 p-0"
                    data-testid={`button-edit-${league.id}`}
                    disabled={actionLoading?.id === league.id && actionLoading?.action === 'rename'}
                  >
                    {actionLoading?.id === league.id && actionLoading?.action === 'rename' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Edit2 className="w-3 h-3" />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => onLoadLeague(league)}
                    data-testid={`button-load-${league.id}`}
                    disabled={loadingLeagueId === league.id}
                    className="h-7 px-2 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    {loadingLeagueId === league.id ? 'Loading...' : 'Load'}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        data-testid={`button-delete-trigger-${league.id}`}
                        disabled={loadingLeagueId === league.id || (actionLoading?.id === league.id && actionLoading?.action === 'delete')}
                        className="h-7 w-7 p-0"
                      >
                        {actionLoading?.id === league.id && actionLoading?.action === 'delete' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
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
              </>
            )}
          </div>

          {/* Progress Bar - shown when loading */}
          {loadingLeagueId === league.id && uploadProgress && (
            <div className="mt-2 space-y-1 px-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">{uploadProgress.message}</span>
                {uploadProgress.loaded !== undefined && uploadProgress.total !== undefined && (
                  <span className="text-primary font-bold">
                    {((uploadProgress.loaded / uploadProgress.total) * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              {uploadProgress.loaded !== undefined && uploadProgress.total !== undefined && (
                <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden shadow-lg">
                  <div
                    className="h-2 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] bg-primary"
                    style={{
                      width: `${(uploadProgress.loaded / uploadProgress.total) * 100}%`
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
