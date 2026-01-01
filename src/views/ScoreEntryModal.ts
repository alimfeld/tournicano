import m from "mithril";
import "./ScoreEntryModal.css";
import "./MatchSection.css";
import { MatchSection } from "./MatchSection.ts";
import { Match, Score } from "../model/Tournament.ts";
import { Modal } from "./Modal.ts";
import {
  parseScore as parseScoreFromInput,
  validateScoreInput,
  addDigitToScore,
  formatScoreDisplay,
} from "../model/Score.ts";

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
      state.scoreInput = addDigitToScore(state.scoreInput, digit);
    };

    const addColon = () => {
      const validation = validateScoreInput(state.scoreInput);
      if (validation.canAddColon) {
        state.scoreInput += ":";
      }
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

    // Parse score using Score module
    const parseScore = (): Score | null => {
      const result = parseScoreFromInput(state.scoreInput);
      return result.success && result.score ? result.score : null;
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

    // Format score display using Score module
    const formatScore = () => formatScoreDisplay(state.scoreInput);

    // Determine button states using validation
    const validation = validateScoreInput(state.scoreInput);
    const isValid = parseScore() !== null || state.scoreInput.length === 0;
    const isColonDisabled = !validation.canAddColon;
    const isBackspaceDisabled = state.scoreInput.length === 0;
    const areNumbersDisabled = !validation.canAddDigit;

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
