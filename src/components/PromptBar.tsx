import { useRef, useState } from "react";
import { motion } from "motion/react";
import { IconArrowUp } from "@tabler/icons-react";
import { spring } from "@/lib/motion";

/** The one prompt bar — beautifului.dev composer treatment: recessed field,
 *  hairline border (strengthens on focus), textarea on top, controls row
 *  below with the ink-colored circular send button on the right. */
export function PromptBar({
  value,
  onChange,
  onSend,
  placeholder = "Ask about the position…",
  disabled = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const canSend = !!value.trim() && !disabled;

  function send() {
    if (!canSend) return;
    onSend();
    if (taRef.current) taRef.current.style.height = "auto";
  }

  return (
    <div
      onClick={() => taRef.current?.focus()}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "text",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${focused ? "var(--line-strong)" : "var(--line)"}`,
        background: "var(--surface-2)",
        padding: 10,
        boxShadow: "0 1px 2px rgba(0,0,0,0.035)",
        transition: "border-color 150ms",
      }}
    >
      <textarea
        ref={taRef}
        value={value}
        rows={1}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          onChange(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 108)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={placeholder}
        enterKeyHint="send"
        style={{
          width: "100%",
          fontSize: 16, // iOS zoom floor
          lineHeight: 1.4,
          padding: "2px 4px",
          border: "none",
          background: "transparent",
          color: "var(--ink)",
          outline: "none",
          resize: "none",
          maxHeight: 108,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <motion.button
          type="button"
          whileTap={canSend ? { scale: 0.94 } : undefined}
          transition={spring}
          disabled={!canSend}
          onClick={send}
          aria-label="Send"
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-full)",
            background: "var(--ink)",
            color: "var(--surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            opacity: canSend ? 1 : 0.4,
            transition: "opacity 150ms",
          }}
        >
          <IconArrowUp size={16} stroke={2.4} />
        </motion.button>
      </div>
    </div>
  );
}
