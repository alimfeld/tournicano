import m from "mithril";
import { ParticipatingPlayer } from "../model/Tournament";
import { getAvatar } from "./AvatarCache.ts";
import "./ParticipatingPlayerCard.css";

export interface ParticipatingPlayerCardAttrs {
  player: ParticipatingPlayer;
  badge?: string;
  onClick?: () => void;
}

const getPerformanceBadge = (player: ParticipatingPlayer): string | undefined => {
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

export const ParticipatingPlayerCard: m.Component<ParticipatingPlayerCardAttrs> = {
  view: (vnode) => {
    const player = vnode.attrs.player;
    const avatarUri = getAvatar(player.name);
    const leftBadge = vnode.attrs.badge;  // Caller-provided
    const rightBadge = getPerformanceBadge(player);  // Auto-calculated

    return m(
      "article.player",
      {
        class: player.active ? "active" : "inactive",
        onclick: vnode.attrs.onClick,
        style: vnode.attrs.onClick ? "cursor: pointer;" : undefined
      },
      leftBadge ? m("span.player-badge-left", leftBadge) : null,
      rightBadge ? m("span.player-badge-right", rightBadge) : null,
      m("img", { src: avatarUri }),
      m("p", player.name),
    );
  },
};
