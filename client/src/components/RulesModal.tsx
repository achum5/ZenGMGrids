import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, X } from "lucide-react";
import { Sport } from "@/lib/bbgm-parser";

interface RulesModalProps {
  sport?: Sport;
}

const generalRules = {
  welcome: "Welcome to ZenGM Grids",
  description: "Upload any ZenGM league (Basketball, Football, Hockey, Baseball) as a .json / .json.gz file or paste a public URL (Dropbox, GitHub, etc.).",
  contact: {
    intro: "Bugs or ideas? Reach out:",
    links: [
      { platform: "Reddit", handle: "u/achum5", url: "https://www.reddit.com/user/achum5/" },
      { platform: "Discord", handle: "Chum (search for me in the bbgm discord server)", url: "https://discord.gg/basketball-gm-and-zengm-290013534023057409" },
      { platform: "Instagram", handle: "alexguess_", url: "https://www.instagram.com/alexguess_/" },
      { platform: "Twitter", handle: "alexguess_", url: "https://x.com/alexguess_" }
    ]
  }
};

const sportSpecificRules = {
  basketball: {
    title: "BBGM Grids",
    eligibility: {
      title: "How eligibility works",
      rules: [
        "Season-aligned achievements only need to match a team when the square is Team × Achievement. The player must have earned it in that same season with that team.",
        "Finals MVP: must be with the team from that title run.",
        "League Leaders: count with any team the player played for during that leader season.",
        "Achievement × Achievement squares do not require the same season.",
        "Non-season (career/draft) achievements: count if the player ever played for the team (any season) and meets the career/draft condition."
      ]
    },
    seasonAchievements: {
      title: "Season-aligned achievements",
      items: [
        "All-Star",
        "MVP (Most Valuable Player)",
        "DPOY (Defensive Player of the Year)",
        "ROY (Rookie of the Year)",
        "SMOY (Sixth Man of the Year)",
        "MIP (Most Improved Player)",
        "Finals MVP",
        "All-League Team (any tier)",
        "All-Defensive Team (any tier)",
        "All-Rookie Team (any tier)",
        "Points Leader • Rebounds Leader • Assists Leader • Steals Leader • Blocks Leader"
      ],
      note: "Note for small leagues: If your league has fewer than 20 seasons, the generator uses a simplified mode to keep puzzles solvable — single-season achievements won't be used in generation."
    },
    careerAchievements: {
      title: "Non-season (career/draft) achievements",
      items: [
        "#1 Overall Pick • First Round Pick • Went Undrafted",
        "Hall of Fame • Played 15+ Seasons • Played 10+ Seasons",
        "20,000+ Career Points • 10,000+ Career Rebounds • 5,000+ Career Assists",
        "2,000+ Career Steals • 1,500+ Career Blocks • 2,000+ Made Threes"
      ],
      basketballNote: "Basketball-specific draft note: Second Round Pick"
    },
    scoring: {
      title: "Scoring (all sports)",
      rules: [
        "Each correct guess = its rarity score (10–100 points).",
        "Base rarity: we rank all eligible players for that cell from rarest → most common using a popularity model (awards & career volume). Rarest ≈ 100, most common ≈ 10, others scale in between.",
        "Small-pool bonus: harder cells with few eligible players get extra points (more bonus for smaller pools).",
        "Cell-aware tweaks: when available, the model also considers team fit and category fit to reward creative picks."
      ]
    }
  },
  football: {
    title: "Football GM Grids — Quick Rules",
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
    scoring: [
      "1. Team fit: How much the player truly belongs to the team(s) in the square—played real minutes/games and had impact, not just a cameo.",
      "2. Category fit: How strongly the player matches the stat/award—e.g., cleared the threshold (20k points) or actually won MVP that year.",
      "3. Fame: How well-known the player is overall—Hall of Fame status, MVPs, All-Star selections, and big career volume.",
      "Common picks → lower score.",
      "Rare picks → higher score.",
      "Very small answer pools can add a small bonus—but only if your pick wasn't the obvious one."
    ],
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
    scoring: [
      "1. Team fit: How much the player truly belongs to the team(s) in the square—played real minutes/games and had impact, not just a cameo.",
      "2. Category fit: How strongly the player matches the stat/award—e.g., cleared the threshold (20k points) or actually won MVP that year.",
      "3. Fame: How well-known the player is overall—Hall of Fame status, MVPs, All-Star selections, and big career volume.",
      "Common picks → lower score.",
      "Rare picks → higher score.",
      "Very small answer pools can add a small bonus—but only if your pick wasn't the obvious one."
    ],
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
    scoring: [
      "1. Team fit: How much the player truly belongs to the team(s) in the square—played real minutes/games and had impact, not just a cameo.",
      "2. Category fit: How strongly the player matches the stat/award—e.g., cleared the threshold (20k points) or actually won MVP that year.",
      "3. Fame: How well-known the player is overall—Hall of Fame status, MVPs, All-Star selections, and big career volume.",
      "Common picks → lower score.",
      "Rare picks → higher score.",
      "Very small answer pools can add a small bonus—but only if your pick wasn't the obvious one."
    ],
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
              {/* Welcome */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">{generalRules.welcome}</h3>
                <p className="text-base mb-4">{generalRules.description}</p>
              </div>

              {/* Contact Information */}
              <div>
                <p className="font-medium mb-3">{generalRules.contact.intro}</p>
                <div className="space-y-2">
                  {generalRules.contact.links.map((link, index) => (
                    <div key={index}>
                      <span className="font-medium">{link.platform}: </span>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 underline"
                      >
                        {link.handle}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : sportRules ? (
            <div className="space-y-6">
              {/* Basketball BBGM Format */}
              {sport === 'basketball' && (sportRules as any).eligibility ? (
                <>
                  {/* How eligibility works */}
                  <div>
                    <h3 className="font-semibold mb-3 text-base">{(sportRules as any).eligibility.title}</h3>
                    <ul className="space-y-2">
                      {(sportRules as any).eligibility.rules.map((rule: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Season-aligned achievements */}
                  <div>
                    <h3 className="font-semibold mb-3 text-base">{(sportRules as any).seasonAchievements.title}</h3>
                    <ul className="space-y-2">
                      {(sportRules as any).seasonAchievements.items.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-sm text-muted-foreground italic">{(sportRules as any).seasonAchievements.note}</p>
                  </div>

                  {/* Non-season achievements */}
                  <div>
                    <h3 className="font-semibold mb-3 text-base">{(sportRules as any).careerAchievements.title}</h3>
                    <ul className="space-y-2">
                      {(sportRules as any).careerAchievements.items.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-sm text-muted-foreground italic">{(sportRules as any).careerAchievements.basketballNote}</p>
                  </div>

                  {/* Scoring */}
                  <div>
                    <h3 className="font-semibold mb-3 text-base">{(sportRules as any).scoring.title}</h3>
                    <ul className="space-y-2">
                      {(sportRules as any).scoring.rules.map((rule: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (sportRules as any).howCellsWork ? (
                <>
                  {/* Quick Rules Format for other sports with howCellsWork */}
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
                      {(sportRules as any).achievements.career.map((achievement: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Draft */}
                  {(sportRules as any).achievements.draft.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-base">Draft</h3>
                      <div className="text-center">
                        <span>{(sportRules as any).achievements.draft[0]}</span>
                      </div>
                    </div>
                  )}

                  {/* Scoring */}
                  {(sportRules as any).scoring && (
                    <div>
                      <h3 className="font-semibold mb-3 text-base">Scoring</h3>
                      <ul className="space-y-2">
                        {(sportRules as any).scoring.map((rule: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
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
              ) : (sportRules as any).achievements ? (
                <>
                  {/* Standard format for other sports */}

                  {/* Achievements Section */}
                  <div>
                    <h3 className="font-semibold mb-3">{sport!.charAt(0).toUpperCase() + sport!.slice(1)} — Achievements & Alignment</h3>
                    
                    {/* Career */}
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Career (Team × Career requires ever played for team)</h4>
                      <ul className="space-y-1 ml-4">
                        {(sportRules as any).achievements.career.map((achievement: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>



                    {/* Draft */}
                    {(sportRules as any).achievements.draft.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Draft</h4>
                        <ul className="space-y-1 ml-4">
                          {(sportRules as any).achievements.draft.map((draft: string, index: number) => (
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
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}