import React from "react";
import { getPlayerImage } from "@/lib/faceRenderer";
import type { Player, Team } from '@/types/bbgm';
import { getPlayerJerseyInfo } from '@/lib/jersey-utils';

type Props = { 
  pid: number; 
  name: string; 
  imgURL?: string | null; 
  face?: any | null; 
  size?: number; 
  hideName?: boolean;
  // New props for jersey styling
  player?: Player;
  teams?: Team[];
  sport?: string;
};

export function PlayerFace({ pid, name, imgURL, face, size = 110, hideName = false, player, teams = [], sport }: Props) {
  const [kind, setKind] = React.useState<"url" | "svg" | "none">("none");
  const [data, setData] = React.useState("");

  React.useEffect(() => {
    let ok = true;
    (async () => {
      // Get jersey info if player and teams are provided
      let jerseyInfo = undefined;
      if (player && teams.length > 0) {
        jerseyInfo = getPlayerJerseyInfo(player, teams, sport);
      }
      
      const res = await getPlayerImage({ pid, name, imgURL, face, jerseyInfo });
      if (ok) { setKind(res.type); setData(res.data); }
    })();
    return () => { ok = false; };
  }, [pid, imgURL, face, player, teams]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-1 gap-1 pointer-events-none">
      {/* Face box: square that scales with tile; leaves room for the name */}
      <div
        className="w-full max-h-[82%] aspect-square overflow-hidden rounded-xl bg-transparent"
      >
        {kind === "url" && (
          <img
            src={data}
            alt={name}
            className="block w-full h-full object-contain"
            draggable={false}
          />
        )}

        {kind === "svg" && (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: data }}
            />
          </div>
        )}

        {kind === "none" && (
          <div className="flex items-center justify-center w-full h-full text-xs text-slate-500 dark:text-slate-300">
            No image
          </div>
        )}
      </div>

      {/* Name: readable on all sizes */}
      {!hideName && (
        <div className="text-center font-semibold leading-tight text-white [font-size:clamp(11px,2.5vw,15px)]">
          {name}
        </div>
      )}
    </div>
  );
}