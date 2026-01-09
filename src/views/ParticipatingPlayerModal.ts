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
    // Partner statistics
    const uniquePartners = player.partners.size;
    const partnerCounts = Array.from(player.partners.values())
      .map(rounds => rounds.length);
    const minPartnerings = partnerCounts.length > 0 ? Math.min(...partnerCounts) : 0;
    const maxPartnerings = partnerCounts.length > 0 ? Math.max(...partnerCounts) : 0;

    // Opponent statistics
    const uniqueOpponents = player.opponents.size;
    const opponentCounts = Array.from(player.opponents.values())
      .map(rounds => rounds.length);
    const minOppositions = opponentCounts.length > 0 ? Math.min(...opponentCounts) : 0;
    const maxOppositions = opponentCounts.length > 0 ? Math.max(...opponentCounts) : 0;

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

        // Stats Section
        m("table.striped",
          m("tbody",
            m("tr",
              m("th[scope=row]", "Win Ratio"),
              m("td", `${(player.winRatio * 100).toFixed(0)}%`),
              m("td", `${player.wins}-${player.draws}-${player.losses}`),
            ),
            m("tr",
              m("th[scope=row]", "Points"),
              m("td", `${player.plusMinus >= 0 ? "+" : ""}${player.plusMinus}`),
              m("td", `+${player.pointsFor}/-${player.pointsAgainst}`),
            ),
            m("tr",
              m("th[scope=row]", "Play Ratio"),
              m("td", `${(player.playRatio * 100).toFixed(0)}% `),
              m("td", `${player.matchCount}/${player.matchCount + player.pauseCount}`),
            ),
            m("tr",
              m("th[scope=row]", "Partners"),
              m("td", `${uniquePartners}`),
              m("td", `${minPartnerings}-${maxPartnerings}`),
            ),
            m("tr",
              m("th[scope=row]", "Opponents"),
              m("td", `${uniqueOpponents}`),
              m("td", `${minOppositions}-${maxOppositions}`),
            ),
          ),
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
