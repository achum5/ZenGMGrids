import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getPlayerImage } from '@/lib/faceRenderer';
import { getPlayerJerseyInfo } from '@/lib/jersey-utils';
import type { Player, Team } from '@/types/bbgm';

interface PlayerPageModalProps {
  player: Player | null;
  sport: 'basketball' | 'football' | 'hockey' | 'baseball';
  teams?: Team[];
  season?: number;
  onClose: () => void;
}

export function PlayerPageModal({ player, sport, teams = [], season, onClose }: PlayerPageModalProps) {
  const [imageKind, setImageKind] = useState<"url" | "svg" | "none">("none");
  const [imageData, setImageData] = useState("");

  useEffect(() => {
    if (!player) return;

    let ok = true;
    (async () => {
      // Get jersey info if player and teams are provided
      let jerseyInfo = undefined;
      if (player && teams.length > 0) {
        jerseyInfo = getPlayerJerseyInfo(player, teams, sport, season);
      }

      const res = await getPlayerImage({
        pid: player.pid,
        name: player.name,
        imgURL: player.imgURL,
        face: player.face,
        jerseyInfo
      });

      if (ok) {
        setImageKind(res.type);
        setImageData(res.data);
      }
    })();
    return () => { ok = false; };
  }, [player, teams, season, sport]);

  if (!player) return null;

  return (
    <Dialog open={!!player} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        {/* Player Header Section */}
        <div className="flex flex-col lg:flex-row items-start gap-6 pt-2">
          {/* Left Side: Image + Details */}
          <div className="flex items-start gap-6">
            {/* Player Image */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 sm:w-40 sm:h-40">
                {imageKind === "url" && (
                  <img
                    src={imageData}
                    alt={player.name}
                    className="block w-full h-full object-contain"
                    draggable={false}
                  />
                )}

                {imageKind === "svg" && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div
                      className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: imageData }}
                    />
                  </div>
                )}

                {imageKind === "none" && (
                  <div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
            </div>

            {/* Player Name and Details */}
            <div className="flex-1 min-w-0 space-y-2">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight break-words">
              {player.name}
            </h2>

            {/* Player Details */}
            <div className="space-y-1 text-sm text-muted-foreground">
              {/* Height and Weight */}
              {(player.hgt || player.weight) && (
                <div>
                  {player.hgt && (
                    <span>{Math.floor(player.hgt / 12)}'{player.hgt % 12}"</span>
                  )}
                  {player.hgt && player.weight && <span> • </span>}
                  {player.weight && <span>{player.weight} lbs</span>}
                </div>
              )}

              {/* Born */}
              {player.born && (
                <div>
                  <span className="font-semibold">Born:</span> {player.born.year || 'Unknown'}
                  {player.born.loc && <span> - {player.born.loc}</span>}
                </div>
              )}

              {/* Age (as of latest season) */}
              {player.born?.year && season && (
                <div>
                  <span className="font-semibold">Age:</span> {season - player.born.year}
                </div>
              )}

              {/* Draft */}
              {player.draft && (player.draft.year || player.draft.round || player.draft.pick) && (
                <div>
                  <span className="font-semibold">Draft:</span>{' '}
                  {player.draft.year && <span>{player.draft.year}</span>}
                  {(player.draft.round || player.draft.pick) && (
                    <>
                      {player.draft.year && <span> - </span>}
                      {player.draft.round && <span>Round {player.draft.round}</span>}
                      {player.draft.pick && <span> (Pick {player.draft.pick})</span>}
                    </>
                  )}
                </div>
              )}

              {/* College */}
              <div>
                <span className="font-semibold">College:</span>{' '}
                {player.college || 'None'}
              </div>

              {/* Experience (years in league) */}
              {player.stats && player.stats.length > 0 && (
                <div>
                  <span className="font-semibold">Experience:</span>{' '}
                  {(() => {
                    // Get unique seasons played
                    const seasonsPlayed = new Set(
                      player.stats
                        .filter(s => !s.playoffs && s.gp && s.gp > 0)
                        .map(s => s.season)
                    );
                    const years = seasonsPlayed.size;
                    return `${years} ${years === 1 ? 'year' : 'years'}`;
                  })()}
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Right Side: Ratings */}
          {season && player.ratings && (() => {
            const seasonRating = player.ratings.find(r => r.season === season);
            const prevSeasonRating = player.ratings.find(r => r.season === season - 1);

            if (!seasonRating) return null;

            const getRatingChange = (current?: number, previous?: number) => {
              if (current == null || previous == null) return null;
              const diff = current - previous;
              if (diff === 0) return null;
              return diff > 0 ? `(+${diff})` : `(${diff})`;
            };

            return (
              <div className="space-y-3 min-w-[280px]">
                {/* Overall and Potential */}
                <div className="space-y-1">
                  <div className="text-lg font-bold">
                    Overall: {seasonRating.ovr ?? 'N/A'}
                  </div>
                  <div className="text-lg font-bold">
                    Potential: {seasonRating.pot ?? 'N/A'}{' '}
                    <span className="text-sm text-muted-foreground">
                      {getRatingChange(seasonRating.pot, prevSeasonRating?.pot)}
                    </span>
                  </div>
                </div>

                {/* Three Column Ratings */}
                <div className="grid grid-cols-3 gap-4 text-xs">
                  {/* Physical */}
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm mb-1">Physical</div>
                    {seasonRating.hgt != null && (
                      <div className="flex justify-between">
                        <span>Height:</span>
                        <span className="font-medium">
                          {seasonRating.hgt}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.hgt, prevSeasonRating?.hgt)}
                          </span>
                        </span>
                      </div>
                    )}
                    {seasonRating.stre != null && (
                      <div className="flex justify-between">
                        <span>Strength:</span>
                        <span className="font-medium">
                          {seasonRating.stre}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.stre, prevSeasonRating?.stre)}
                          </span>
                        </span>
                      </div>
                    )}
                    {seasonRating.spd != null && (
                      <div className="flex justify-between">
                        <span>Speed:</span>
                        <span className="font-medium">
                          {seasonRating.spd}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.spd, prevSeasonRating?.spd)}
                          </span>
                        </span>
                      </div>
                    )}
                    {seasonRating.jmp != null && (
                      <div className="flex justify-between">
                        <span>Jumping:</span>
                        <span className="font-medium">
                          {seasonRating.jmp}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.jmp, prevSeasonRating?.jmp)}
                          </span>
                        </span>
                      </div>
                    )}
                    {seasonRating.endu != null && (
                      <div className="flex justify-between">
                        <span>Endurance:</span>
                        <span className="font-medium">
                          {seasonRating.endu}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.endu, prevSeasonRating?.endu)}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Shooting */}
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm mb-1">Shooting</div>
                    {seasonRating.ins != null && (
                      <div className="flex justify-between">
                        <span>Inside:</span>
                        <span className="font-medium">
                          {seasonRating.ins}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.ins, prevSeasonRating?.ins)}
                          </span>
                        </span>
                      </div>
                    )}
                    {seasonRating.dnk != null && (
                      <div className="flex justify-between">
                        <span>Dunks/Layups:</span>
                        <span className="font-medium">
                          {seasonRating.dnk}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.dnk, prevSeasonRating?.dnk)}
                          </span>
                        </span>
                      </div>
                    )}
                    {seasonRating.ft != null && (
                      <div className="flex justify-between">
                        <span>Free Throws:</span>
                        <span className="font-medium">
                          {seasonRating.ft}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.ft, prevSeasonRating?.ft)}
                          </span>
                        </span>
                      </div>
                    )}
                    {seasonRating.fg != null && (
                      <div className="flex justify-between">
                        <span>Mid Range:</span>
                        <span className="font-medium">
                          {seasonRating.fg}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.fg, prevSeasonRating?.fg)}
                          </span>
                        </span>
                      </div>
                    )}
                    {seasonRating.tp != null && (
                      <div className="flex justify-between">
                        <span>Three Pointers:</span>
                        <span className="font-medium">
                          {seasonRating.tp}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.tp, prevSeasonRating?.tp)}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Skill */}
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm mb-1">Skill</div>
                    {seasonRating.oiq != null && (
                      <div className="flex justify-between">
                        <span>Offensive IQ:</span>
                        <span className="font-medium">
                          {seasonRating.oiq}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.oiq, prevSeasonRating?.oiq)}
                          </span>
                        </span>
                      </div>
                    )}
                    {seasonRating.diq != null && (
                      <div className="flex justify-between">
                        <span>Defensive IQ:</span>
                        <span className="font-medium">
                          {seasonRating.diq}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.diq, prevSeasonRating?.diq)}
                          </span>
                        </span>
                      </div>
                    )}
                    {seasonRating.drb != null && (
                      <div className="flex justify-between">
                        <span>Dribbling:</span>
                        <span className="font-medium">
                          {seasonRating.drb}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.drb, prevSeasonRating?.drb)}
                          </span>
                        </span>
                      </div>
                    )}
                    {seasonRating.pss != null && (
                      <div className="flex justify-between">
                        <span>Passing:</span>
                        <span className="font-medium">
                          {seasonRating.pss}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.pss, prevSeasonRating?.pss)}
                          </span>
                        </span>
                      </div>
                    )}
                    {seasonRating.reb != null && (
                      <div className="flex justify-between">
                        <span>Rebounding:</span>
                        <span className="font-medium">
                          {seasonRating.reb}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            {getRatingChange(seasonRating.reb, prevSeasonRating?.reb)}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* TODO: Add career stats here */}
      </DialogContent>
    </Dialog>
  );
}
