import m from "mithril";
import "./ParticipatingPlayerModal.css";
import { ParticipatingPlayer } from "../model/tournament/Tournament.ts";
import { getAvatar } from "./AvatarCache.ts";
import { GroupSymbol } from "./GroupSymbol.ts";
import { Modal } from "./Modal.ts";

export interface ParticipatingPlayerModalAttrs {
  player: ParticipatingPlayer;
  onClose: () => void;
}

export const ParticipatingPlayerModal: m.Component<ParticipatingPlayerModalAttrs> = {
  view: ({ attrs: { player, onClose } }) => {

    return m(Modal, { onClose, className: 'participating-player-modal' },
      m("article",
        // Header: Avatar, Name, Performance Badge, Group
        m("header",
          m("button[aria-label=Close][rel=prev]", {
            onclick: onClose,
          }),
          m("section",
            m("img", {
              src: getAvatar(player.name),
              alt: player.name
            }),
            m("h2", player.name),
            m(GroupSymbol, { group: player.group }),
          ),
        ),

        // Stats Section - Use semantic HTML (dl/dt/dd)
        m("dl.stats-grid",

          // Win %
          m("dt", "Win Ratio"),
          m("dd", `${(player.winRatio * 100).toFixed(0)}%`),

          // Record
          m("dt", "W-D-L"),
          m("dd", `${player.wins}-${player.draws}-${player.losses}`),

          // Plus/Minus
          m("dt", "Points"),
          m("dd", `${player.plusMinus >= 0 ? "+" : ""}${player.plusMinus}`),

          // Points For/Against
          m("dt", "Plus/Minus"),
          m("dd", `+${player.pointsFor}/-${player.pointsAgainst}`),

          // Play %
          m("dt", "Play Ratio"),
          m("dd", `${(player.playRatio * 100).toFixed(0)}% `),

          // Matches (& Pauses)
          m("dt", "Matches"),
          m("dd", `${player.matchCount} / ${player.matchCount + player.pauseCount}`),

          // Partners
          m("dt", "Partners"),
          m("dd", player.partners.size),

          // Opponents
          m("dt", "Opponents"),
          m("dd", player.opponents.size)
        ),

        // Footer: Active toggle
        m("footer",
          // Active toggle
          m("label", { for: "player-active" },
            m("input", {
              type: "checkbox",
              role: "switch",
              id: "player-active",
              name: "player-active",
              checked: player.active,
              onchange: (e: Event) => {
                const checked = (e.target as HTMLInputElement).checked;
                player.activate(checked);
              }
            }),
            "Active"
          ),
        )
      )
    );
  },
};
