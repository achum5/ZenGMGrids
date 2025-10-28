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
  scale?: number; // New prop for scaling
  // New props for jersey styling
  player?: Player;
  teams?: Team[];
  sport?: string;
  season?: number; // Add season prop
};

export function PlayerFace({ pid, name, imgURL, face, size = 110, hideName = false, scale = 1, player, teams = [], sport, season }: Props) {
  const [kind, setKind] = React.useState<"url" | "svg" | "none">("none");
  const [data, setData] = React.useState("");
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  React.useEffect(() => {
    if (!player) return;

    let ok = true;
    (async () => {
      // Get jersey info if player and teams are provided - EXACT SAME AS MODAL
      let jerseyInfo = undefined;
      if (player && teams.length > 0) {
        jerseyInfo = getPlayerJerseyInfo(player, teams, sport, season);
      }

      // Use player object properties like the modal does - NOT separate props
      const res = await getPlayerImage({
        pid: player.pid,
        name: player.name,
        imgURL: player.imgURL,
        face: player.face,
        jerseyInfo
      });

      if (ok) { setKind(res.type); setData(res.data); }
    })();
    return () => { ok = false; };
  }, [player, teams, season, sport]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-1 gap-1 pointer-events-none">
      {/* Face box: square that scales with tile; leaves room for the name */}
      <div
        className="w-full max-h-[90%] aspect-square overflow-hidden rounded-xl bg-transparent"
      >
        {kind === "url" && (
          <img
            src={data}
            alt={name}
            className="block w-full h-full object-contain"
            draggable={false}
            style={{ transform: 'translateX(-7px)' }}
          />
        )}

        {kind === "svg" && (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ transform: `translateX(${isMobile ? '15px' : '4px'}) scale(${scale})` }}
          >
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