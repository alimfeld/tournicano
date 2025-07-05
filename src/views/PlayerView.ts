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
      vnode.attrs.debug && isPlayerStats(player)
        ? m(
            "div.debug",
            m("span.play-ratio", `M${player.playRatio.toFixed(2)}`),
            m(
              "span.performance",
              `P${player.winRatio.toFixed(2)}/${player.plusMinus}`,
            ),
            m("span.group", `G${player.group}`),
          )
        : null,
      m("img", { src: avatar.toDataUri() }),
      m("p", player.name),
      vnode.children,
    );
  },
};
