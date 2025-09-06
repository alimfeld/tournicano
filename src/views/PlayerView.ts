import m from "mithril";
import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";
import { Player, PlayerStats } from "../model/Tournament";

export interface PlayerAttrs {
  player: Player | PlayerStats;
  debug?: boolean;
}

const isPlayerStats = (player: Player | PlayerStats): player is PlayerStats => {
  return (<PlayerStats>player).wins !== undefined;
};

export const PlayerView: m.Component<PlayerAttrs> = {
  view: (vnode) => {
    const player = vnode.attrs.player;
    const avatar = createAvatar(bottts, {
      seed: player.name,
    });
    return m(
      "article.player",
      m("img", { src: avatar.toDataUri() }),
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
      vnode.children,
    );
  },
};
