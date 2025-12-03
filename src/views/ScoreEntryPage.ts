import m from "mithril";
import "./RoundPage.css";
import { PlayerView } from "./PlayerView.ts";
import { Match, Score } from "../model/Tournament.ts";

export interface ScoreEntryAttrs {
  roundIndex: number;
  matchIndex: number;
  match: Match;
  onClose: () => void;
}

interface ScoreEntryState {
  scoreInput: string;
}

export const ScoreEntryPage: m.Component<ScoreEntryAttrs, ScoreEntryState> = {
  oninit: ({ state, attrs }) => {
    // Initialize with existing score if available
    if (attrs.match.score) {
      const [scoreA, scoreB] = attrs.match.score;
      state.scoreInput = `${scoreA}:${scoreB}`;
    } else {
      state.scoreInput = "";
    }
  },

  view: ({ attrs: { roundIndex, matchIndex, match, onClose }, state }) => {
    const addDigit = (digit: string) => {
      const parts = state.scoreInput.split(":");

      if (parts.length === 1) {
        // Before colon - entering team A score
        if (parts[0].length < 2) {
          state.scoreInput += digit;
          // Auto-add colon after 2 digits
          if (state.scoreInput.length === 2) {
            state.scoreInput += ":";
          }
        }
      } else if (parts.length === 2) {
        // After colon - entering team B score
        if (parts[1].length < 2) {
          state.scoreInput += digit;
        }
      }
    };

    const addColon = () => {
      // If there's already a colon, do nothing
      if (state.scoreInput.includes(":")) {
        return;
      }

      // If empty, do nothing (colon should be disabled)
      if (state.scoreInput.length === 0) {
        return;
      }

      // Just add colon
      state.scoreInput += ":";
    };

    const backspace = () => {
      if (state.scoreInput.length > 0) {
        state.scoreInput = state.scoreInput.slice(0, -1);
      }
    };

    // Validate and parse score
    const parseScore = (): Score | null => {
      if (!state.scoreInput.includes(":")) {
        return null;
      }
      const parts = state.scoreInput.split(":");
      if (parts.length !== 2) {
        return null;
      }

      // Both parts must have at least one digit
      if (parts[0] === "" || parts[1] === "") {
        return null;
      }

      const scoreA = parseInt(parts[0]);
      const scoreB = parseInt(parts[1]);

      if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) {
        return null;
      }
      return [scoreA, scoreB];
    };

    const accept = () => {
      const score = parseScore();
      if (score) {
        match.submitScore(score);
        onClose();
      }
    };

    const clear = () => {
      match.submitScore(undefined);
      onClose();
    };

    const cancel = () => {
      onClose();
    };

    // Format score display
    const formatScore = () => {
      if (state.scoreInput.length === 0) {
        return "--:--";
      }
      return state.scoreInput;
    };

    const isValid = parseScore() !== null;
    const isColonDisabled = state.scoreInput.length === 0 || state.scoreInput.includes(":");

    return m.fragment({}, [
      m("main.score-entry.container-fluid.fullscreen", [
        m("section.match", [
          m("section.team", [
            m(PlayerView, { player: match.teamA.player1, debug: false }),
            m(PlayerView, { player: match.teamA.player2, debug: false }),
          ]),
          m("section.vs", [
            m("h2.match", `Match ${matchIndex + 1}`),
            m("div.score-text", formatScore()),
          ]),
          m("section.team", [
            m(PlayerView, { player: match.teamB.player1, debug: false }),
            m(PlayerView, { player: match.teamB.player2, debug: false }),
          ]),
        ]),

        m("section.keyboard", [
          // Row 0: Actions
          m("button.secondary", { onclick: cancel }, "Cancel"),
          m(
            "button.clear",
            {
              disabled: !match.score,
              onclick: clear,
            },
            "Delete",
          ),
          m(
            "button.accept",
            {
              disabled: !isValid,
              onclick: accept,
            },
            "Submit",
          ),
          // Row 1: 1-3
          m("button.key-number", { onclick: () => addDigit("1") }, "1"),
          m("button.key-number", { onclick: () => addDigit("2") }, "2"),
          m("button.key-number", { onclick: () => addDigit("3") }, "3"),
          // Row 2: 4-6
          m("button.key-number", { onclick: () => addDigit("4") }, "4"),
          m("button.key-number", { onclick: () => addDigit("5") }, "5"),
          m("button.key-number", { onclick: () => addDigit("6") }, "6"),
          // Row 3: 7-9
          m("button.key-number", { onclick: () => addDigit("7") }, "7"),
          m("button.key-number", { onclick: () => addDigit("8") }, "8"),
          m("button.key-number", { onclick: () => addDigit("9") }, "9"),
          // Row 4: Colon, 0, Backspace
          m("button.key-action.secondary", {
            onclick: addColon,
            disabled: isColonDisabled,
          }, ":"),
          m("button.key-number", { onclick: () => addDigit("0") }, "0"),
          m("button.key-action.secondary", { onclick: backspace }, "⌫"),
        ]),
      ]),
    ]);
  },
};
