import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, X } from "lucide-react";
import { type Sport } from "@/lib/league-normalizer";

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
    title: "Quick Rules — Basketball",
    eligibility: {
      title: "Eligibility",
      rules: [
        "Team × Award (All-Star, MVP, DPOY, ROY, SMOY, MIP, All-League, All-Defense, All-Rookie, Finals MVP, League Leaders): Must match the same team in that award/leader season. (Season-aligned.)",

        "Team × Season Stat (“X in a season”): Not season-aligned. If a player ever hit that season stat in any year and has ever played for the team, it counts.",
        "Team × Career/Draft items (career totals, Hall of Fame, Played X+ seasons, #1 pick / first-round / undrafted, etc.): Not season-aligned. Any year in the career + any team they played for.",
        "Achievement × Achievement: Never requires the same season. Each achievement can come from different seasons.",
        "League Leaders: If present, count the leader with any team the player appeared for during that leader season."
      ]
    },
    seasonAchievements: {
      title: "Season-aligned achievements",
      items: [
        "All-Star • MVP • Defensive Player of the Year • Rookie of the Year",
        "Sixth Man of the Year • Most Improved Player",
        "Champion • All-Rookie Team • All-League Team • All-Defense Team",
        "Finals MVP • League Leaders (if enabled)"
      ],
      note: "Note: In smaller leagues (< 20 seasons), generation may simplify single-season items."
    },
    careerAchievements: {
      title: "Non-season (career/draft) achievements",
      items: [
        "#1 Overall Pick • First Round Pick • Second Round Pick • Went Undrafted",
        "Hall of Fame • Played 15+ Seasons • Played 10+ Seasons",
        "Career milestone categories (examples): points, rebounds, assists, steals, blocks, 3-pointers made."
      ]
    },
    scoring: {
      title: "Scoring",
      rules: [
        "Each correct guess earns 10–100 points.",
        "Points are a percentile rarity score based on a composite of:",
        "      - Player popularity/usage",
        "      - Achievement fit/strength for that specific square",
        "      - Team relevance/fit for that player"
      ]
    }
  },
  football: {
    title: "Quick Rules — Football",
    eligibility: {
      title: "Eligibility",
      rules: [
        "Team × Award (All-Star, MVP, DPOY, ROY variants, All-League, All-Defense, All-Rookie, Finals/Playoff MVP, League Leaders): Must match the same team in that award/leader season. (Season-aligned.)",
        "Team × Season Stat (“X in a season”): Not season-aligned. If a player ever hit that season stat in any year and has ever played for the team, it counts.",
        "Team × Career/Draft items (career totals, Hall of Fame, Played X+ seasons, #1 pick / first-round / undrafted, etc.): Not season-aligned. Any year in the career + any team they played for.",
        "Achievement × Achievement: Never requires the same season. Each achievement can come from different seasons.",
        "League Leaders: If present, count the leader with any team the player appeared for during that leader season."
      ]
    },
    seasonAchievements: {
      title: "Season-aligned achievements",
      items: [
        "All-Star • MVP • Defensive Player of the Year",
        "Rookie of the Year (including offensive/defensive variants)",
        "Champion • All-Rookie Team • All-League Team • All-Defense Team",
        "Finals/Playoff MVP • League Leaders (if enabled)"
      ],
      note: "Note: In smaller leagues (< 20 seasons), generation may simplify single-season items."
    },
    careerAchievements: {
      title: "Non-season (career/draft) achievements",
      items: [
        "#1 Overall Pick • First Round Pick • Went Undrafted",
        "Hall of Fame • Played 15+ Seasons • Played 10+ Seasons",
        "Career milestone categories (examples): passing TDs, rushing yards/TDs, receiving yards/TDs, sacks, interceptions."
      ]
    },
    scoring: {
      title: "Scoring",
      rules: [
        "Each correct guess earns 10–100 points.",
        "Points are a percentile rarity score based on a composite of:",
        "      - Player popularity/usage",
        "      - Achievement fit/strength for that specific square",
        "      - Team relevance/fit for that player",
        "Rarer, less obvious matches score closer to 100; common, obvious answers score closer to 10."
      ],
      note: "Looking for the full list of achievements? See the Create Custom Grid modal."
    }
  },
  baseball: {
    title: "Quick Rules — Baseball",
    eligibility: {
      title: "Eligibility",
      rules: [
        "Team × Award (All-Star, MVP, ROY, All-League, All-Defense, All-Rookie, Finals/Playoff MVP, League Leaders): Must match the same team in that award/leader season. (Season-aligned.)",
        "Team × Season Stat (“X in a season”): Not season-aligned. If a player ever hit that season stat in any year and has ever played for the team, it counts.",
        "Team × Career/Draft items (career totals, Hall of Fame, Played X+ seasons, #1 pick / first-round / undrafted, etc.): Not season-aligned. Any year in the career + any team they played for.",
        "Achievement × Achievement: Never requires the same season. Each achievement can come from different seasons.",
        "League Leaders: If present, count the leader with any team the player appeared for during that leader season."
      ]
    },
    seasonAchievements: {
      title: "Season-aligned achievements",
      items: [
        "All-Star • MVP • Rookie of the Year",
        "Champion • All-Rookie Team • All-League Team • All-Defense Team",
        "Finals/Playoff MVP • League Leaders (if enabled)"
      ],
      note: "Note: In smaller leagues (< 20 seasons), generation may simplify single-season items."
    },
    careerAchievements: {
      title: "Non-season (career/draft) achievements",
      items: [
        "#1 Overall Pick • First Round Pick • Went Undrafted",
        "Hall of Fame • Played 15+ Seasons • Played 10+ Seasons",
        "Career milestone categories (examples): hits, home runs, RBIs, stolen bases, runs, pitching wins/strikeouts/saves."
      ]
    },
    scoring: {
      title: "Scoring",
      rules: [
        "Each correct guess earns 10–100 points.",
        "Points are a percentile rarity score based on a composite of:",
        "      - Player popularity/usage",
        "      - Achievement fit/strength for that specific square",
        "      - Team relevance/fit for that player",
        "Rarer, less obvious matches score closer to 100; common, obvious answers score closer to 10."
      ],
      note: "Looking for the full list of achievements? See the Create Custom Grid modal."
    }
  },
  hockey: {
    title: "Quick Rules — Hockey",
    eligibility: {
      title: "Eligibility",
      rules: [
        "Team × Award (All-Star, MVP, ROY, DPOY equivalent if used, All-League, All-Defense, All-Rookie, Finals/Playoff MVP, League Leaders): Must match the same team in that award/leader season. (Season-aligned.)",

        "Team × Season Stat (“X in a season”): Not season-aligned. If a player ever hit that season stat in any year and has ever played for the team, it counts.",
        "Team × Career/Draft items (career totals, Hall of Fame, Played X+ seasons, #1 pick / first-round / undrafted, etc.): Not season-aligned. Any year in the career + any team they played for.",
        "Achievement × Achievement: Never requires the same season. Each achievement can come from different seasons.",
        "League Leaders: If present, count the leader with any team the player appeared for during that leader season."
      ]
    },
    seasonAchievements: {
      title: "Season-aligned achievements",
      items: [
        "All-Star • MVP • Rookie of the Year",
        "Champion • All-Rookie Team • All-League Team • All-Defense Team",
        "Finals/Playoff MVP • League Leaders (if enabled)"
      ],
      note: "Note: In smaller leagues (< 20 seasons), generation may simplify single-season items."
    },
    careerAchievements: {
      title: "Non-season (career/draft) achievements",
      items: [
        "#1 Overall Pick • First Round Pick • Went Undrafted",
        "Hall of Fame • Played 15+ Seasons • Played 10+ Seasons",
        "Career milestone categories (examples): goals, assists, points, goalie wins/shutouts, games played."
      ]
    },
    scoring: {
      title: "Scoring",
      rules: [
        "Each correct guess earns 10–100 points.",
        "Points are a percentile rarity score based on a composite of:",
        "      - Player popularity/usage",
        "      - Achievement fit/strength for that specific square",
        "      - Team relevance/fit for that player",
        "Rarer, less obvious matches score closer to 100; common, obvious answers score closer to 10."
      ],
      note: "Looking for the full list of achievements? See the Create Custom Grid modal."
    }
  }
};

export function RulesModal({ sport }: RulesModalProps) {
  const isGeneralRules = !sport;
  const sportRules = sport ? sportSpecificRules[sport as keyof typeof sportSpecificRules] : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid="button-rules">
          <HelpCircle className="h-[1.2rem] w-[1.2rem] ml-[3px]" />
          <span className="sr-only">Rules</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
        <DialogHeader>
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
              {/* Basketball BBGM Format & Football FBGM Format & Hockey ZGMH Format & Baseball ZGMB Format */}
              {(sport === 'basketball' || sport === 'football' || sport === 'hockey' || sport === 'baseball') && (sportRules as any).eligibility ? (
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
                    {sport === 'basketball' && (sportRules as any).careerAchievements.basketballNote && (
                      <p className="mt-3 text-sm text-muted-foreground italic">{(sportRules as any).careerAchievements.basketballNote}</p>
                    )}
                  </div>

                  {/* Scoring */}
                  <div>
                    <h3 className="font-semibold mb-3 text-base">{(sportRules as any).scoring.title}</h3>
                    <ul className="space-y-2">
                      {(sportRules as any).scoring.rules.map((rule: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          {rule.trimStart() !== rule ? null : <span className="text-primary">•</span>}
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
                        {(sportRules as any).scoring.rules.map((rule: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            {rule.trimStart() !== rule ? null : <span className="text-primary">•</span>}
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