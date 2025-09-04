import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, X } from "lucide-react";
import { Sport } from "@/lib/bbgm-parser";

interface RulesModalProps {
  sport?: Sport;
}

const generalRules = {
  goal: "Fill the grid. Each cell needs one player who satisfies both labels (row × column).",
  whatCounts: [
    "Team × Team: The player must have appeared (GP > 0) for both teams (any seasons).",
    "Team × Category (career): The player must meet the career requirement and have GP > 0 for that team in any season.",
    "Team × Award: The player must have earned that award while on that team in that season.",
    "Category × Category: The player must satisfy both categories; team doesn't matter."
  ],
  oneUse: "A player can be used only once per grid (no duplicates across cells).",
  scoring: [
    "Common picks → lower score.",
    "Rare, on-brand picks → higher score.",
    "Very small answer pools can add a small bonus—but only if your pick wasn't the obvious one."
  ],
  giveUp: "Fills every remaining cell with the most common valid answer for that cell, without duplicates. Those cells are marked in red."
};

const sportSpecificRules = {
  basketball: {
    title: "Basketball ZenGM Grids — Rules",
    howCellsWork: [
      "Match both labels.",
      "Team × Team: player must appear (GP > 0) for both teams (any seasons).",
      "Team × Career: player must have ever played for the team + meet the career/longevity/birthplace item.",
      "Team × Award: player must do it with that team in that season."
    ],
    achievements: {
      career: [
        "20,000+ Points • 10,000+ Rebounds • 5,000+ Assists",
        "2,000+ Steals • 1,500+ Blocks • 2,000+ Made Threes",
        "Played 10+ Seasons • Played 15+ Seasons",
        "Hall of Fame",
        "Born outside 50 states + DC"
      ],
      awards: [
        "Most Valuable Player",
        "Defensive Player of the Year",
        "Rookie of the Year",
        "Sixth Man of the Year",
        "Finals MVP",
        "All-Star",
        "Champion (must have GP > 0 in RS or playoffs with the title team)"
      ],
      draft: [
        "#1 Overall • First Round • Second Round • Undrafted",
        "Drafted as Teenager (age ≤ 19 at draft)"
      ]
    },
    remember: "No duplicate players across the grid."
  },
  football: {
    title: "Football ZenGM Grids — Quick Rules",
    howCellsWork: [
      "Match both labels.",
      "Team × Team: player must appear (GP > 0) for both teams (any seasons).",
      "Team × Career: player must have ever played for the team + meet the career/longevity/birthplace item.",
      "Team × Award: player must do it with that team in that season."
    ],
    achievements: {
      career: [
        "Pass TDs: 150+ career",
        "Rushing: 8,000+ yards; 40+ TDs career",
        "Receiving: 6,000+ yards; 40+ TDs career",
        "Defense: 60+ sacks; 20+ interceptions career",
        "Longevity: played 10+ seasons; played 15+ seasons",
        "Hall of Fame",
        "Born outside 50 states + DC"
      ],
      awards: [
        "Most Valuable Player",
        "Defensive Player of the Year",
        "Rookie of the Year"
      ],
      draft: [
        "#1 Overall • First Round • Second Round • Undrafted"
      ]
    },
    remember: "No duplicate players across the grid."
  },
  baseball: {
    title: "Baseball ZenGM Grids — Quick Rules",
    howCellsWork: [
      "Match both labels.",
      "Team × Team: appeared (GP > 0) for both teams (any seasons).",
      "Team × Career: has ever played for the team + meets the career/long-term/birthplace requirement.",
      "Team × Award: must do it with that team in that season."
    ],
    achievements: {
      career: [
        "3,000+ Hits • 500+ HR • 1,500+ RBI • 400+ SB • 1,800+ Runs",
        "300+ Wins (P) • 3,000+ SO (P) • 300+ Saves (P)",
        "Played 10+ Seasons • Played 15+ Seasons • Hall of Fame",
        "Born outside 50 states + DC"
      ],
      awards: [
        "Most Valuable Player",
        "Pitcher of the Year • Relief Pitcher of the Year",
        "Rookie of the Year",
        "All-Star",
        "Finals MVP (championship series)",
        "Champion (GP > 0 in RS or playoffs with the title team)"
      ],
      draft: [
        "#1 Overall • First Round • Went Undrafted • Drafted as Teenager (age ≤ 19 at draft)"
      ]
    },
    notes: [
      "\"(P)\" items apply to pitchers in that season.",
      "No duplicate players across the grid."
    ]
  },
  hockey: {
    title: "Hockey ZenGM Grids — Quick Rules",
    howCellsWork: [
      "Match both labels.",
      "Team × Team: player appeared (GP > 0) for both teams (any seasons).",
      "Team × Career: player has ever played for the team + meets the career/longevity/birthplace item.",
      "Team × Award: player must do it with that team in that season."
    ],
    achievements: {
      career: [
        "500+ Goals • 1,000+ Points • 500+ Assists",
        "200+ Goalie Wins (G) • 50+ Goalie Shutouts (G)",
        "Played 10+ Seasons • Played 15+ Seasons",
        "Hall of Fame",
        "Born outside 50 states + DC",
        "#1 Overall • First Round • Second Round • Undrafted • Drafted as Teenager (age ≤ 19 at draft)"
      ],
      awards: [
        "Most Valuable Player",
        "Defensive Forward of the Year",
        "Goalie of the Year",
        "Rookie of the Year",
        "Playoffs MVP",
        "All-Star",
        "Champion (must have GP > 0 in RS or playoffs with the title team)"
      ],
      draft: []
    },
    notes: [
      "\"(G)\" items apply to players who were goalies in that season.",
      "Save% uses the season value in the uploaded league.",
      "No duplicate players across the grid."
    ]
  }
};

export function RulesModal({ sport }: RulesModalProps) {
  const isGeneralRules = !sport;
  const sportRules = sport ? sportSpecificRules[sport as keyof typeof sportSpecificRules] : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid="button-rules">
          <HelpCircle className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Rules</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isGeneralRules ? "ZenGM Grids - General Rules" : sportRules?.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-sm">
          {isGeneralRules ? (
            <div className="space-y-6">
              {/* Goal */}
              <div>
                <h3 className="font-semibold mb-2 text-base">Goal</h3>
                <p>{generalRules.goal}</p>
              </div>

              {/* What counts as a match */}
              <div>
                <h3 className="font-semibold mb-3 text-base">What counts as a match</h3>
                <ul className="space-y-2">
                  {generalRules.whatCounts.map((rule, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* One-use rule */}
              <div>
                <h3 className="font-semibold mb-2 text-base">One-use rule</h3>
                <p>{generalRules.oneUse}</p>
              </div>

              {/* Scoring */}
              <div>
                <h3 className="font-semibold mb-3 text-base">Scoring (short & simple)</h3>
                <ul className="space-y-2">
                  {generalRules.scoring.map((rule, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Give Up */}
              <div>
                <h3 className="font-semibold mb-2 text-base">Give Up</h3>
                <p>{generalRules.giveUp}</p>
              </div>
            </div>
          ) : sportRules ? (
            <div className="space-y-6">
              {/* Quick Rules Format for all sports with howCellsWork */}
              {(sportRules as any).howCellsWork ? (
                <>
                  {/* How cells work */}
                  <div>
                    <h3 className="font-semibold mb-3 text-base">How cells work</h3>
                    <ul className="space-y-2">
                      {(sportRules as any).howCellsWork.map((rule: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Career */}
                  <div>
                    <h3 className="font-semibold mb-3 text-base">Career</h3>
                    <ul className="space-y-2">
                      {sportRules.achievements.career.map((achievement: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>


                  {/* Awards */}
                  <div>
                    <h3 className="font-semibold mb-3 text-base">Awards (with-team that year)</h3>
                    <ul className="space-y-2">
                      {sportRules.achievements.awards.map((award: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{award}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Draft */}
                  {sportRules.achievements.draft.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-base">Draft</h3>
                      <div className="text-center">
                        <span>{sportRules.achievements.draft[0]}</span>
                      </div>
                    </div>
                  )}

                  {/* Remember/Notes */}
                  {(sportRules as any).remember ? (
                    <div>
                      <h3 className="font-semibold mb-2 text-base">Remember</h3>
                      <p>{(sportRules as any).remember}</p>
                    </div>
                  ) : (sportRules as any).notes ? (
                    <div>
                      <h3 className="font-semibold mb-3 text-base">Notes</h3>
                      <ul className="space-y-2">
                        {(sportRules as any).notes.map((note: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {/* Standard format for other sports */}

                  {/* Achievements Section */}
                  <div>
                    <h3 className="font-semibold mb-3">{sport!.charAt(0).toUpperCase() + sport!.slice(1)} — Achievements & Alignment</h3>
                    
                    {/* Career */}
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Career (Team × Career requires ever played for team)</h4>
                      <ul className="space-y-1 ml-4">
                        {sportRules.achievements.career.map((achievement: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>


                    {/* Awards/Honors */}
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Awards/Honors (with-team that season)</h4>
                      <ul className="space-y-1 ml-4">
                        {sportRules.achievements.awards.map((award: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{award}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Draft */}
                    {sportRules.achievements.draft.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Draft</h4>
                        <ul className="space-y-1 ml-4">
                          {sportRules.achievements.draft.map((draft: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{draft}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Team × Team Rule Note */}
                  <div className="border-t pt-4">
                    <p className="text-muted-foreground text-sm">
                      <strong>Remember:</strong> Team × Team rule is simple—must have GP &gt; 0 for both teams (any seasons).
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}