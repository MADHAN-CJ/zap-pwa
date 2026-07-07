import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./theme.css";

// Browser tabs use CSS 100dvh (see theme.css). Installed iOS PWAs, however,
// under-report the viewport height on first paint (dvh/lvh/innerHeight are all
// short until the first touch, so the tab bar floats up). window.screen.height
// is the device's *physical* screen height — static and correct immediately —
// and in a fullscreen standalone PWA the app fills the whole screen, so it's
// exactly the height we want. Clamp --app-height to it while standalone.
const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

if (isStandalone) {
  const setAppHeight = () => {
    const measured = window.visualViewport?.height ?? window.innerHeight;
    const h = Math.max(measured, window.screen.height);
    document.documentElement.style.setProperty("--app-height", `${h}px`);
  };
  setAppHeight();
  ["resize", "orientationchange"].forEach((e) => window.addEventListener(e, setAppHeight));
  window.visualViewport?.addEventListener("resize", setAppHeight);
}

// Router basename mirrors the build-time base path (for sub-path hosting).
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
