import m from "mithril";
import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";
import { Player } from "../model/Tournament";

export interface PlayerAttrs {
  player: Player;
}

export const PlayerView: m.Component<PlayerAttrs> = {
  view: (vnode) => {
    const avatar = createAvatar(bottts, {
      seed: vnode.attrs.player.name,
    });
    return m(
      "article.player",
      m("img", { src: avatar.toDataUri() }),
      m("p", vnode.attrs.player.name),
      vnode.children,
    );
  },
};
