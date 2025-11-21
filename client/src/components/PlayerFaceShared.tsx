import React, { useState, useEffect } from 'react';
import { getPlayerImage } from '@/lib/faceRenderer';
import { getPlayerJerseyInfo } from '@/lib/jersey-utils';
import type { Player, Team } from '@/types/bbgm';

interface PlayerFaceSharedProps {
  player: Player;
  teams: Team[];
  sport?: string;
  season?: number;
  teamId?: number; // Optional team ID for accurate jersey lookup (important for mid-season trades)
  className?: string;
  svgClassName?: string; // Additional className only for SVG rendering
  svgStyle?: React.CSSProperties; // Additional inline style only for SVG rendering
  imgClassName?: string; // Additional className only for image URL rendering
}

/**
 * Unified player face renderer used by BOTH tiles and modals.
 * This ensures identical rendering logic and caching.
 */
export function PlayerFaceShared({ player, teams, sport, season, teamId, className = '', svgClassName = '', svgStyle, imgClassName = '' }: PlayerFaceSharedProps) {
  const [imageType, setImageType] = useState<"url" | "svg" | "none">("none");
  const [imageData, setImageData] = useState("");

  useEffect(() => {
    if (!player) return;

    let ok = true;
    (async () => {
      // Get jersey info if teams are provided
      let jerseyInfo = undefined;
      if (teams.length > 0) {
        jerseyInfo = getPlayerJerseyInfo(player, teams, sport, season, teamId);
      }

      const res = await getPlayerImage({
        pid: player.pid,
        name: player.name,
        imgURL: player.imgURL,
        face: player.face,
        jerseyInfo,
        season,
        sport
      });

      if (ok) {
        setImageType(res.type);
        setImageData(res.data);
      }
    })();
    return () => { ok = false; };
  }, [player, teams, season, sport, teamId]);

  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`}>
      {imageType === "url" && (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={imageData}
            alt={player.name}
            className={`block max-w-full max-h-full ${imgClassName || 'object-contain'}`}
            draggable={false}
          />
        </div>
      )}

      {imageType === "svg" && (
        <div
          className={`w-full h-full flex items-center justify-center ${svgClassName}`}
          style={svgStyle}
          dangerouslySetInnerHTML={{ __html: imageData }}
        />
      )}

      {imageType === "none" && (
        <div className="flex items-center justify-center w-full h-full text-xs text-slate-500">
          No image
        </div>
      )}
    </div>
  );
}
