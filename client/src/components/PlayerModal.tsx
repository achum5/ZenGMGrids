import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlayerFace } from "@/components/PlayerFace";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { useMemo } from 'react';
import type { Player, Team, CatTeam } from '@/types/bbgm';
import { computeRarityForGuess, playerToEligibleLite } from '@/lib/rarity';
import { generateFeedbackMessage, type GridConstraint } from '@/lib/feedback';
import { cellKey } from '@/lib/grid-generator';
import { CareerTeamLogo, checkAllTeamsHaveLogos } from '@/components/CareerTeamLogo';
import { generateReasonBullets } from '@/lib/reason-bullets';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  player: Player | null;
  teams: Team[];
  eligiblePlayers?: Player[];
  puzzleSeed?: string;
  rows?: CatTeam[];
  cols?: CatTeam[];
  currentCellKey?: string;
  sport?: string;
  isGridCompleted?: boolean;
};

// Helper function to get team name at a specific season
function teamNameAtSeason(teamsByTid: Map<number, Team>, tid: number, season: number): string {
  const team = teamsByTid.get(tid);
  if (!team) {
    // Better fallback for missing teams - try to be more descriptive
    return `Historical Team (ID: ${tid})`;
  }
  
  const seasonInfo = team.seasons?.find(s => s.season === season);
  if (seasonInfo && seasonInfo.region && seasonInfo.name) {
    return `${seasonInfo.region} ${seasonInfo.name}`;
  }
  
  // fallback to current name, handle missing region gracefully
  const region = team.region || team.abbrev || '';
  const name = team.name || 'Unknown Team';
  return region ? `${region} ${name}` : name;
}

export function PlayerModal({ open, onOpenChange, player, teams, eligiblePlayers = [], puzzleSeed = "", rows = [], cols = [], currentCellKey = "", sport, isGridCompleted = false }: Props) {
  if (!player) return null;

  // Create team lookup map for efficient lookups - defensive check for teams array
  const teamsByTid = new Map(Array.isArray(teams) ? teams.map(team => [team.tid, team]) : []);

  // Memoize expensive calculations
  const modalData = useMemo(() => {
    try {
      if (!currentCellKey || rows.length === 0 || cols.length === 0) {
        return null;
      }

      const [rowKey, colKey] = currentCellKey.split('|');
      const rowConstraint = rows.find(r => r.key === rowKey);
      const colConstraint = cols.find(c => c.key === colKey);
      
      if (!rowConstraint || !colConstraint) {
        return null;
      }

      const isCorrectGuess = eligiblePlayers.some(p => p.pid === player.pid);
      
      if (isCorrectGuess) {
      // Calculate rarity for correct guesses
      const eligiblePool = eligiblePlayers.map(p => playerToEligibleLite(p));
      if (eligiblePool.length > 0) {
        const guessedPlayer = playerToEligibleLite(player);
        const rarity = computeRarityForGuess({
          guessed: guessedPlayer,
          eligiblePool: eligiblePool,
          puzzleSeed: puzzleSeed,
          cellContext: {
            rowConstraint: {
              type: rowConstraint.type,
              tid: rowConstraint.tid,
              achievementId: rowConstraint.achievementId,
              label: rowConstraint.label
            },
            colConstraint: {
              type: colConstraint.type,
              tid: colConstraint.tid,
              achievementId: colConstraint.achievementId,
              label: colConstraint.label
            }
          },
          fullPlayers: eligiblePlayers,
          teams: new Map(Array.isArray(teams) ? teams.map(t => [t.tid, t]) : [])
        });
        
        // Generate reason bullets for correct guess
        const reasonBullets = generateReasonBullets(
          player,
          {
            type: rowConstraint.type,
            tid: rowConstraint.tid,
            achievementId: rowConstraint.achievementId,
            label: rowConstraint.label
          },
          {
            type: colConstraint.type,
            tid: colConstraint.tid,
            achievementId: colConstraint.achievementId,
            label: colConstraint.label
          },
          Array.isArray(teams) ? teams : [],
          sport || 'basketball'
        );

        return {
          type: 'correct' as const,
          rarity,
          reasonBullets
        };
      }
    } else {
      // Generate feedback for wrong guesses
      const feedbackMessage = generateFeedbackMessage(
        player,
        {
          type: rowConstraint.type,
          tid: rowConstraint.tid,
          achievementId: rowConstraint.achievementId,
          label: rowConstraint.label
        },
        {
          type: colConstraint.type,
          tid: colConstraint.tid,
          achievementId: colConstraint.achievementId,
          label: colConstraint.label
        },
        Array.isArray(teams) ? teams : []
      );

      return {
        type: 'wrong' as const,
        feedbackMessage
      };
    }

    return null;
    } catch (error) {
      console.error('Error in PlayerModal modalData calculation:', error);
      return null;
    }
  }, [player.pid, currentCellKey, eligiblePlayers, puzzleSeed, rows, cols, teams, sport]);

  // Get feedback message and color for score
  const getScoreFeedback = (score: number): { message: string; colorClass: string } => {
    const feedbackOptions = {
      "10-20": [
        "Classic choice",
        "Reliable pick",
        "Can't go wrong",
        "Staple answer",
        "Trusted name"
      ],
      "21-40": [
        "Good call",
        "Solid choice",
        "Steady pick",
        "Well played",
        "Strong answer"
      ],
      "41-60": [
        "Nice find",
        "Quality pick",
        "Smart call",
        "Good eye",
        "Well spotted"
      ],
      "61-80": [
        "Great pull",
        "Sharp choice",
        "Underrated find",
        "Well done",
        "Strong grab"
      ],
      "81-100": [
        "Rare gem",
        "Brilliant find",
        "Elite choice",
        "Outstanding",
        "Legendary pick"
      ]
    };

    let options: string[] = [];
    let colorClass = "";

    if (score >= 10 && score <= 20) {
      options = feedbackOptions["10-20"];
      colorClass = "text-red-600";
    } else if (score >= 21 && score <= 40) {
      options = feedbackOptions["21-40"];
      colorClass = "text-orange-500";
    } else if (score >= 41 && score <= 60) {
      options = feedbackOptions["41-60"];
      colorClass = "text-yellow-600";
    } else if (score >= 61 && score <= 80) {
      options = feedbackOptions["61-80"];
      colorClass = "text-green-500";
    } else if (score >= 81 && score <= 100) {
      options = feedbackOptions["81-100"];
      colorClass = "text-indigo-600";
    }

    // Use player pid as seed for consistent random selection
    const randomIndex = Math.abs(player.pid) % options.length;
    const message = options[randomIndex] || "Nice pick";

    return { message, colorClass };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[92vw] max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden" data-testid="modal-player-details">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40">
              <PlayerFace
                pid={player.pid}
                name={player.name}
                imgURL={player.imgURL ?? undefined}
                face={player.face}
                size={160}
                hideName={true}
                player={player}
                teams={teams}
                sport={sport}
              />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight dark:text-white">
                {player.name}
              </DialogTitle>
              
              {/* Score feedback for correct guesses OR feedback message for wrong guesses */}
              {modalData && modalData.type === 'correct' && (
                <div className="mt-2">
                  <span className={`text-lg font-bold ${getScoreFeedback(modalData.rarity).colorClass}`}>
                    Score: {modalData.rarity}
                  </span>
                  
                  {/* Reason bullets for correct guesses */}
                  {modalData.reasonBullets.length > 0 && (
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {modalData.reasonBullets.map((bullet, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-xs leading-5">•</span>
                          <span className="leading-5">{bullet.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {modalData && modalData.type === 'wrong' && (
                <div className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-red-700 dark:text-red-300 leading-5">
                      {modalData.feedbackMessage}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 flex-1 overflow-y-auto min-h-0 space-y-4">
          {/* Awards */}
          {player.awards && player.awards.length > 0 && (
            <div>
              <h3 className="font-semibold text-base mb-2">Awards & Honors</h3>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  // Group and count awards
                  const awardCounts: Record<string, number> = {};
                  player.awards.forEach(award => {
                    awardCounts[award.type] = (awardCounts[award.type] || 0) + 1;
                  });

                  // Create condensed award display
                  const condensedAwards: { text: string; isHallOfFame?: boolean }[] = [];
                  
                  Object.entries(awardCounts).forEach(([type, count]) => {
                    switch (type) {
                      case "Inducted into the Hall of Fame":
                        condensedAwards.push({ text: "Hall of Fame", isHallOfFame: true });
                        break;
                      case "Most Valuable Player":
                        condensedAwards.push({ text: count > 1 ? `${count}x MVP` : "MVP" });
                        break;
                      case "Finals MVP":
                        condensedAwards.push({ text: count > 1 ? `${count}x FMVP` : "FMVP" });
                        break;
                      case "Won Championship":
                        condensedAwards.push({ text: count > 1 ? `${count}x Champion` : "Champion" });
                        break;
                      case "Rookie of the Year":
                        condensedAwards.push({ text: "ROY" });
                        break;
                      case "All-Star MVP":
                        condensedAwards.push({ text: count > 1 ? `${count}x All-Star MVP` : "All-Star MVP" });
                        break;
                      case "All-Star":
                        condensedAwards.push({ text: count > 1 ? `${count}x All-Star` : "All-Star" });
                        break;
                      case "First Team All-League":
                      case "Second Team All-League":
                      case "Third Team All-League":
                        // Count all All-League teams together
                        if (!condensedAwards.some(award => award.text.includes("All-League"))) {
                          const allLeagueCount = (player.awards || []).filter(a => 
                            a.type.includes("All-League")
                          ).length;
                          condensedAwards.push({ text: allLeagueCount > 1 ? `${allLeagueCount}x All-League` : "All-League" });
                        }
                        break;
                      case "First Team All-Defensive":
                      case "Second Team All-Defensive":
                        // Count all All-Defensive teams together
                        if (!condensedAwards.some(award => award.text.includes("All-Defensive"))) {
                          const allDefensiveCount = (player.awards || []).filter(a => 
                            a.type.includes("All-Defensive")
                          ).length;
                          condensedAwards.push({ text: allDefensiveCount > 1 ? `${allDefensiveCount}x All-Defensive` : "All-Defensive" });
                        }
                        break;
                      case "League Scoring Leader":
                        condensedAwards.push({ text: count > 1 ? `${count}x Scoring Leader` : "Scoring Leader" });
                        break;
                      case "League Rebounding Leader":
                        condensedAwards.push({ text: count > 1 ? `${count}x Rebounding Leader` : "Rebounding Leader" });
                        break;
                      case "League Assists Leader":
                        condensedAwards.push({ text: count > 1 ? `${count}x Assists Leader` : "Assists Leader" });
                        break;
                      case "League Steals Leader":
                        condensedAwards.push({ text: count > 1 ? `${count}x Steals Leader` : "Steals Leader" });
                        break;
                      case "League Blocks Leader":
                        condensedAwards.push({ text: count > 1 ? `${count}x Blocks Leader` : "Blocks Leader" });
                        break;
                      default:
                        condensedAwards.push({ text: count > 1 ? `${count}x ${type}` : type });
                        break;
                    }
                  });

                  // Sort to put Hall of Fame first
                  const sortedAwards = condensedAwards.sort((a, b) => {
                    if (a.isHallOfFame && !b.isHallOfFame) return -1;
                    if (!a.isHallOfFame && b.isHallOfFame) return 1;
                    return 0;
                  });

                  return sortedAwards.map((award, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className={award.isHallOfFame 
                        ? "text-xs bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 border-yellow-500 font-bold dark:from-yellow-500 dark:to-yellow-700 dark:text-yellow-100" 
                        : "text-xs bg-slate-500 text-white dark:bg-slate-600 dark:text-slate-100"
                      }
                    >
                      {award.text}
                    </Badge>
                  ));
                })()}
              </div>
            </div>
          )}

          <Separator className="my-4" />

          {/* Career Summary - Teams and Years */}
          {player.seasons && player.seasons.length > 0 && (
            <div>
              <h3 className="font-semibold text-base mb-2">Career Summary</h3>
              <div className="w-full rounded-md border p-3 overflow-y-auto" style={{ maxHeight: '12rem' }}>
                <div className="space-y-1 text-sm">
                {(() => {
                  // Get regular season stats only and sort by season
                  const regularSeasonStats = player.seasons
                    .filter(s => !s.playoffs)
                    .sort((a, b) => a.season - b.season);

                  if (regularSeasonStats.length === 0) return null;

                  // Group consecutive seasons by team
                  const teamStints: Array<{
                    tid: number;
                    firstSeason: number;
                    lastSeason: number;
                    seasons: number[];
                  }> = [];

                  let currentStint = {
                    tid: regularSeasonStats[0].tid,
                    firstSeason: regularSeasonStats[0].season,
                    lastSeason: regularSeasonStats[0].season,
                    seasons: [regularSeasonStats[0].season]
                  };

                  for (let i = 1; i < regularSeasonStats.length; i++) {
                    const season = regularSeasonStats[i];
                    
                    // If same team and consecutive season, extend current stint
                    if (season.tid === currentStint.tid && 
                        season.season === currentStint.lastSeason + 1) {
                      currentStint.lastSeason = season.season;
                      currentStint.seasons.push(season.season);
                    } else {
                      // Different team or gap in years, start new stint
                      teamStints.push(currentStint);
                      currentStint = {
                        tid: season.tid,
                        firstSeason: season.season,
                        lastSeason: season.season,
                        seasons: [season.season]
                      };
                    }
                  }
                  
                  // Don't forget the last stint
                  teamStints.push(currentStint);

                  // Check if all teams in the career have working logos (all-or-nothing approach)
                  const teamsInCareer = teamStints.map(stint => teamsByTid.get(stint.tid)).filter(Boolean) as Team[];
                  const allTeamsHaveLogos = checkAllTeamsHaveLogos(teamsInCareer);
                  
                  
                  return teamStints.map((stint, idx) => {
                    const team = teamsByTid.get(stint.tid);
                    const teamName = teamNameAtSeason(teamsByTid, stint.tid, stint.firstSeason);
                    const yearRange = stint.firstSeason === stint.lastSeason 
                      ? `${stint.firstSeason}` 
                      : `${stint.firstSeason}–${stint.lastSeason}`;
                    
                    if (allTeamsHaveLogos && team) {
                      return (
                        <CareerTeamLogo
                          key={idx}
                          team={team}
                          yearRange={yearRange}
                        />
                      );
                    } else {
                      return (
                        <div key={idx} className="font-medium">
                          {teamName} {yearRange}
                        </div>
                      );
                    }
                  });
                })()}
                </div>
              </div>
            </div>
          )}

          <Separator className="my-4" />

          {/* Other Eligible Answers */}
          {eligiblePlayers.length > 0 && (
            <div>
              <h3 className="font-semibold text-base mb-2">
                {(() => {
                  // Check if the current player is in the eligible list (correct answer)
                  const isCorrectAnswer = player && eligiblePlayers.some(p => p.pid === player.pid);
                  return isCorrectAnswer ? "Other Eligible Answers" : "Eligible Answers";
                })()}
              </h3>
              <div className="w-full rounded-md border p-3 overflow-y-auto" style={{ maxHeight: '12rem' }}>
                {!isGridCompleted ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Revealed upon grid completion...
                  </div>
                ) : (
                  <div className="space-y-1 text-sm">
                  {(() => {
                    // Calculate rarity for all eligible players
                    const eligiblePool = eligiblePlayers.map(p => playerToEligibleLite(p));
                    const playersWithRarity = eligiblePlayers.map(p => {
                      const guessedPlayer = playerToEligibleLite(p);
                      
                      // Use the same cell context as the main score calculation
                      let rarity = computeRarityForGuess({
                        guessed: guessedPlayer,
                        eligiblePool: eligiblePool,
                        puzzleSeed: puzzleSeed
                      });
                      
                      // If we have cell context, recalculate with cell-aware system
                      if (currentCellKey && rows && cols) {
                        const [rowKey, colKey] = currentCellKey.split('|');
                        const rowConstraint = rows.find(r => r.key === rowKey);
                        const colConstraint = cols.find(c => c.key === colKey);
                        
                        if (rowConstraint && colConstraint) {
                          rarity = computeRarityForGuess({
                            guessed: guessedPlayer,
                            eligiblePool: eligiblePool,
                            puzzleSeed: puzzleSeed,
                            cellContext: {
                              rowConstraint: {
                                type: rowConstraint.type,
                                tid: rowConstraint.tid,
                                achievementId: rowConstraint.achievementId,
                                label: rowConstraint.label
                              },
                              colConstraint: {
                                type: colConstraint.type,
                                tid: colConstraint.tid,
                                achievementId: colConstraint.achievementId,
                                label: colConstraint.label
                              }
                            },
                            fullPlayers: eligiblePlayers,
                            teams: new Map(teams?.map(t => [t.tid, t]) ?? [])
                          });
                        }
                      }
                      
                      return { player: p, rarity };
                    });

                    // Sort by rarity (most common first = lowest rarity score)
                    playersWithRarity.sort((a, b) => a.rarity - b.rarity);

                    return playersWithRarity.map(({ player: eligiblePlayer, rarity }, idx) => {
                      const isUserGuess = player && eligiblePlayer.pid === player.pid;
                      
                      return (
                        <div 
                          key={eligiblePlayer.pid} 
                          className={`flex justify-between items-center py-1 px-2 rounded ${
                            isUserGuess 
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 italic font-medium" 
                              : ""
                          }`}
                        >
                          <span className="flex-1">
                            {idx + 1}. {eligiblePlayer.name}
                          </span>
                          <span className={`text-xs font-medium ml-2 ${
                            rarity >= 1 && rarity <= 20 
                              ? "text-red-600" 
                              : rarity >= 21 && rarity <= 40 
                                ? "text-orange-500"
                                : rarity >= 41 && rarity <= 60 
                                  ? "text-yellow-600" 
                                  : rarity >= 61 && rarity <= 80 
                                    ? "text-green-500" 
                                    : rarity >= 81 && rarity <= 100 
                                      ? "text-indigo-600" 
                                      : "text-muted-foreground"
                          }`}>
                            {rarity}
                          </span>
                        </div>
                      );
                    });
                  })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}