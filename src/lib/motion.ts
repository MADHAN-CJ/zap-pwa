// Shared spring presets — the app's motion vocabulary. Use these, don't
// invent per-component curves. All liquid: springs with real inertia,
// interruptible, velocity-carrying. transform/opacity only.
import type { Transition } from "motion/react";

/** Default UI spring: settles quick, tiny overshoot. Pills, buttons, chips. */
export const spring: Transition = { type: "spring", stiffness: 500, damping: 34, mass: 0.8 };

/** Soft entrance: feed entries, chat bubbles, cards appearing. */
export const springSoft: Transition = { type: "spring", stiffness: 300, damping: 28, mass: 0.9 };

/** Screen-level transitions: heavier, more glide. */
export const springScreen: Transition = { type: "spring", stiffness: 260, damping: 30, mass: 1 };

/** Press feedback scale for tappables. */
export const pressScale = 0.97;
