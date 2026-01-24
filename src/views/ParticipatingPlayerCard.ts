import m from "mithril";
import { ParticipatingPlayer } from "../model/tournament/Tournament.ts";
import { getAvatar } from "./AvatarCache.ts";
import { getPerformanceBadge } from "../model/tournament/Display.ts";
import "./ParticipatingPlayerCard.css";

export interface ParticipatingPlayerCardAttrs {
  player: ParticipatingPlayer;
  badge?: string;
  onClick?: () => void;
  class?: string;
}

export const ParticipatingPlayerCard: m.Component<ParticipatingPlayerCardAttrs> = {
  view: (vnode) => {
    const player = vnode.attrs.player;
    const avatarUri = getAvatar(player.name);
    const leftBadge = vnode.attrs.badge;  // Caller-provided
    const rightBadge = getPerformanceBadge(player);  // Auto-calculated

    return m(
      "article.player",
      {
        class: `${player.active ? "active" : "inactive"} ${vnode.attrs.class || ""}`,
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
