import m, { ChildArray } from "mithril";
import { Player, PlayerStats } from "../model/Tournament";
import { getAvatar } from "./AvatarCache.ts";

export interface PlayerAttrs {
  player: Player | PlayerStats;
  debug?: boolean;
  pre?: ChildArray;
  post?: ChildArray;
  compact?: boolean;
  badge?: string;
  rank?: string;
}

const isPlayerStats = (player: Player | PlayerStats): player is PlayerStats => {
  return (<PlayerStats>player).wins !== undefined;
};

export const PlayerView: m.Component<PlayerAttrs> = {
  view: (vnode) => {
    const player = vnode.attrs.player;
    const compact = vnode.attrs.compact || false;
    const avatarUri = getAvatar(player.name);

    if (compact) {
      return m("div.player-compact",
        m("img.avatar-small", { src: avatarUri }),
        m("span.player-name", player.name)
      );
    }

    return m(
      "article.player",
      vnode.attrs.badge ? m("span.player-badge", vnode.attrs.badge) : null,
      vnode.attrs.rank ? m("span.player-rank", vnode.attrs.rank) : null,
      vnode.attrs.pre,
      m("img", { src: avatarUri }),
      m("p", player.name),
      vnode.attrs.debug && isPlayerStats(player)
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
      vnode.attrs.post,
    );
  },
};
