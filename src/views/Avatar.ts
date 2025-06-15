import m from "mithril";
import { PlayerProps } from "../core";
import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";

export interface AvatarAttrs {
  player: PlayerProps;
}

export const Avatar: m.Component<AvatarAttrs, {}> = {
  view: ({ attrs: { player } }) => {
    const avatar = createAvatar(bottts, {
      seed: player.name,
    });
    return m("img.avatar", {
      class: player.active ? "active" : "inactive",
      src: avatar.toDataUri(),
    });
  },
};
