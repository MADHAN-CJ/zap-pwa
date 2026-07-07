import { WebHaptics } from "web-haptics";

// Single shared haptics engine. web-haptics drives the iOS Taptic Engine (via the
// switch trick + PWM intensity) and Android's Vibration API.
//
// IMPORTANT: do NOT gate creation on WebHaptics.isSupported — that flag only
// reflects the Vibration API (`navigator.vibrate`), which iOS never implemented,
// so it's always false on iPhone. The engine still fires the iOS Taptic Engine
// via the hidden <input switch>, so we create it in any browser and let
// trigger() choose the right path per platform. (Desktop trigger() is a no-op.)
let engine: WebHaptics | null = null;
try {
  if (typeof window !== "undefined") {
    engine = new WebHaptics({ showSwitch: false });
  }
} catch {
  engine = null;
}

type Preset = "selection" | "light" | "success" | "error";
const fire = (preset: Preset) => {
  try {
    engine?.trigger(preset);
  } catch {
    /* haptics are best-effort — never let them throw into UI */
  }
};

export const haptics = {
  selection: () => fire("selection"), // crisp tick — tab taps, swipe arming
  light: () => fire("light"), // soft tap — refresh
  success: () => fire("success"), // approve
  error: () => fire("error"), // reject
};
