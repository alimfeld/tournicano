import m from "mithril";
import { PlayerStats } from "../model/Tournament";
import { getAvatar } from "./AvatarCache.ts";
import "./PlayerCard.css";

export interface PlayerCardAttrs {
  player: PlayerStats;
  debug?: boolean;
  badge?: string;
}

const getPerformanceBadge = (player: PlayerStats): string | undefined => {
  // Don't show badge if no matches played
  const totalGames = player.wins + player.losses + player.draws;
  if (totalGames === 0) return undefined;
  
  // 100% win rate → 💯
  if (player.winRatio === 1.0) return "💯";
  
  // >= 75% win rate → 🔥
  if (player.winRatio >= 0.75) return "🔥";
  
  // < 75% → no badge
  return undefined;
};

export const PlayerCard: m.Component<PlayerCardAttrs> = {
  view: (vnode) => {
    const player = vnode.attrs.player;
    const avatarUri = getAvatar(player.name);
    const leftBadge = vnode.attrs.badge;  // Caller-provided
    const rightBadge = getPerformanceBadge(player);  // Auto-calculated

    return m(
      "article.player",
      leftBadge ? m("span.player-badge-left", leftBadge) : null,
      rightBadge ? m("span.player-badge-right", rightBadge) : null,
      m("img", { src: avatarUri }),
      m("p", player.name),
      vnode.attrs.debug
        ? m("div.debug",
          m("span", "Group"),
          m("span", player.group),
          m("span", "ΣTeams"),
          m("span", player.partners.size),
          m("span", "Win%"),
          m("span", (player.winRatio * 100).toFixed(0)),
          m("span", "+/-"),
          m("span", player.plusMinus),
          m("span", "Play%"),
          m("span", (player.playRatio * 100).toFixed(0)),
          m("span", "Paused"),
          m(
            "span",
            `${player.pauseCount}/${player.matchCount + player.pauseCount}`,
          ),
        )
        : null,
    );
  },
};
