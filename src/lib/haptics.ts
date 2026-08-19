// Thin, safe wrapper around web-haptics — no-ops where unsupported.
import { WebHaptics } from "web-haptics";

const h = new WebHaptics();

function fire(preset: "light" | "medium" | "selection") {
  h.trigger(preset).catch(() => {
    /* unsupported — fine */
  });
}

/** Small tick — taps, chip selection, sending a message. */
export const tapHaptic = () => fire("light");
/** Firmer — confirmations: Start watching, watch-item confirm. */
export const confirmHaptic = () => fire("medium");
/** Barely-there — list selection, toggles. */
export const selectHaptic = () => fire("selection");
