import { useRef, useState, type PointerEvent, type ReactNode } from "react";

// Swipeable card: drag right past the threshold → onConfirm, drag left → onDelete.
// Behind the card sit two action panels (green confirm on the left, red delete on
// the right) that are revealed as you drag. Tap buttons are also exposed for
// pointer/desktop users so the feature works without a touchscreen.
const THRESHOLD = 96;
const MAX = 130;

export default function SwipeRow({
  onConfirm,
  onDelete,
  disabled,
  children,
}: {
  onConfirm: () => void;
  onDelete: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const active = useRef(false);

  const clamp = (v: number) => Math.max(-MAX, Math.min(MAX, v));

  const down = (e: PointerEvent) => {
    if (disabled) return;
    active.current = true;
    startX.current = e.clientX;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!active.current) return;
    setDx(clamp(e.clientX - startX.current));
  };
  const up = () => {
    if (!active.current) return;
    active.current = false;
    setDragging(false);
    if (dx >= THRESHOLD) {
      setDx(0);
      onConfirm();
    } else if (dx <= -THRESHOLD) {
      setDx(0);
      onDelete();
    } else {
      setDx(0);
    }
  };

  return (
    <div className="swipe-outer">
      {/* action layer behind the card */}
      <div className="swipe-actions">
        <div className="swipe-action confirm" style={{ opacity: dx > 8 ? 1 : 0.35 }}>
          ✓ Confirm
        </div>
        <div className="swipe-action delete" style={{ opacity: dx < -8 ? 1 : 0.35 }}>
          Delete ✕
        </div>
      </div>

      <div
        className="swipe-card"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform 0.18s ease-out",
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {children}
        <div className="swipe-tapbtns">
          <button
            className="tapbtn confirm"
            disabled={disabled}
            onClick={onConfirm}
            aria-label="Confirm order"
          >
            ✓
          </button>
          <button
            className="tapbtn delete"
            disabled={disabled}
            onClick={onDelete}
            aria-label="Delete draft"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
