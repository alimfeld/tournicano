import m from "mithril";
import "./ScoreEntryModal.css";
import "./MatchSection.css";
import { MatchSection } from "./MatchSection.ts";
import { Match, Score } from "../model/Tournament.ts";
import { Modal } from "./Modal.ts";

export interface ScoreEntryModalAttrs {
  roundIndex: number;
  matchIndex: number;
  match: Match;
  onClose: () => void;
}

interface ScoreEntryModalState {
  scoreInput: string;
}

export const ScoreEntryModal: m.Component<ScoreEntryModalAttrs, ScoreEntryModalState> = {
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
        }
        // Auto-add colon after 2 digits
        if (state.scoreInput.length === 2) {
          state.scoreInput += ":";
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
        // If we have exactly "XX:" (2 digits + colon), delete both the colon and the second digit
        if (state.scoreInput.length === 3 && state.scoreInput.endsWith(":")) {
          state.scoreInput = state.scoreInput.slice(0, 1);
        } else {
          state.scoreInput = state.scoreInput.slice(0, -1);
        }
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
      if (state.scoreInput.length === 0) {
        // Empty input means clear the score
        match.submitScore(undefined);
      } else if (score) {
        // Valid score
        match.submitScore(score);
      }
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

    // Submit is valid only if there's a valid score OR empty input (to clear)
    const isValid = parseScore() !== null || state.scoreInput.length === 0;
    const isColonDisabled = state.scoreInput.length === 0 || state.scoreInput.includes(":");
    const isBackspaceDisabled = state.scoreInput.length === 0;
    // Disable numbers if current input position is full (2 digits on either side)
    const parts = state.scoreInput.split(":");
    const areNumbersDisabled = parts.length === 1
      ? parts[0].length >= 2  // Before colon: disable if 2+ digits
      : parts[1].length >= 2; // After colon: disable if 2+ digits on right side

    return m(Modal, { onClose, className: 'score-entry-modal' },
      m("article",
        m(MatchSection, {
          roundIndex,
          match,
          matchIndex,
          mode: "display",
          showRoundIndex: true,
          displayScore: formatScore()
        }),

        m("section.keyboard", [
          // Row 0: Actions (Cancel and Submit at 50% each)
          m("div.action-row", [
            m("button.secondary", { onclick: cancel }, "Cancel"),
            m(
              "button.accept",
              {
                disabled: !isValid,
                onclick: accept,
              },
              "Submit",
            ),
          ]),
          // Row 1: 1-3
          m("button.key-number", { onpointerdown: (e: PointerEvent) => { e.preventDefault(); addDigit("1"); }, disabled: areNumbersDisabled }, "1"),
          m("button.key-number", { onpointerdown: (e: PointerEvent) => { e.preventDefault(); addDigit("2"); }, disabled: areNumbersDisabled }, "2"),
          m("button.key-number", { onpointerdown: (e: PointerEvent) => { e.preventDefault(); addDigit("3"); }, disabled: areNumbersDisabled }, "3"),
          // Row 2: 4-6
          m("button.key-number", { onpointerdown: (e: PointerEvent) => { e.preventDefault(); addDigit("4"); }, disabled: areNumbersDisabled }, "4"),
          m("button.key-number", { onpointerdown: (e: PointerEvent) => { e.preventDefault(); addDigit("5"); }, disabled: areNumbersDisabled }, "5"),
          m("button.key-number", { onpointerdown: (e: PointerEvent) => { e.preventDefault(); addDigit("6"); }, disabled: areNumbersDisabled }, "6"),
          // Row 3: 7-9
          m("button.key-number", { onpointerdown: (e: PointerEvent) => { e.preventDefault(); addDigit("7"); }, disabled: areNumbersDisabled }, "7"),
          m("button.key-number", { onpointerdown: (e: PointerEvent) => { e.preventDefault(); addDigit("8"); }, disabled: areNumbersDisabled }, "8"),
          m("button.key-number", { onpointerdown: (e: PointerEvent) => { e.preventDefault(); addDigit("9"); }, disabled: areNumbersDisabled }, "9"),
          // Row 4: Colon, 0, Backspace
          m("button.key-action.secondary", {
            onpointerdown: (e: PointerEvent) => { e.preventDefault(); addColon(); },
            disabled: isColonDisabled,
          }, ":"),
          m("button.key-number", { onpointerdown: (e: PointerEvent) => { e.preventDefault(); addDigit("0"); }, disabled: areNumbersDisabled }, "0"),
          m("button.key-action.backspace", {
            onpointerdown: (e: PointerEvent) => { e.preventDefault(); backspace(); },
            disabled: isBackspaceDisabled,
          }, "⌫"),
        ]),
      )
    );
  },
};
