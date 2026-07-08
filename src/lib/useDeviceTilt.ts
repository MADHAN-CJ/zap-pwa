import { useEffect, useState } from "react";

// Returns a normalized tilt { x, y } in roughly [-1, 1] from the device's
// orientation, for subtle motion-reactive UI (e.g. a shadow that shifts as you
// move the phone). Degrades to { 0, 0 } when motion isn't available — Android
// works out of the box; iOS needs a secure context (HTTPS) + a permission grant,
// which we request on the first touch.
export function useDeviceTilt(): { x: number; y: number } {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const clamp = (n: number) => Math.max(-1, Math.min(1, n));
    const onOrient = (e: DeviceOrientationEvent) => {
      // gamma = left/right tilt (-90..90); beta = front/back (-180..180),
      // centered around ~45° (a natural holding angle).
      setTilt({ x: clamp((e.gamma ?? 0) / 28), y: clamp(((e.beta ?? 45) - 45) / 28) });
    };

    const listen = () => window.addEventListener("deviceorientation", onOrient);
    const DOE = window.DeviceOrientationEvent as unknown as
      | { requestPermission?: () => Promise<"granted" | "denied"> }
      | undefined;

    let removeGate = () => {};
    if (DOE && typeof DOE.requestPermission === "function") {
      // iOS — must be requested from a user gesture.
      const gate = () => {
        DOE.requestPermission!()
          .then((res) => res === "granted" && listen())
          .catch(() => {});
        window.removeEventListener("touchend", gate);
      };
      window.addEventListener("touchend", gate, { once: true });
      removeGate = () => window.removeEventListener("touchend", gate);
    } else if (typeof window.DeviceOrientationEvent !== "undefined") {
      listen();
    }

    return () => {
      removeGate();
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, []);

  return tilt;
}
