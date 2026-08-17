import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconCheck, IconX, IconBolt } from "@tabler/icons-react";

const TOAST_ICON = {
  success: <IconCheck size={15} stroke={3} />,
  error: <IconX size={15} stroke={3} />,
  info: <IconBolt size={14} stroke={2.5} />,
};

/* ---------------- Spinner ---------------- */
export function Spinner({ dark = false }: { dark?: boolean }) {
  return <span className={dark ? "spinner dark" : "spinner"} />;
}

/* ---------------- Toast + Confirm context ---------------- */
type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; title: string; msg?: string };

type ConfirmOpts = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type UICtx = {
  toast: (kind: ToastKind, title: string, msg?: string) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
};

const Ctx = createContext<UICtx | null>(null);

export function useUI(): UICtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUI must be used inside <UIProvider>");
  return ctx;
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(
    null
  );
  const seq = useRef(0);

  const toast = useCallback((kind: ToastKind, title: string, msg?: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, kind, title, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const confirm = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => setDialog({ ...opts, resolve }));
  }, []);

  const close = (result: boolean) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}

      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span className="toast-ic">{TOAST_ICON[t.kind]}</span>
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              {t.msg ? <div className="toast-msg">{t.msg}</div> : null}
            </div>
          </div>
        ))}
      </div>

      {dialog && (
        <div className="modal-backdrop" onClick={() => close(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{dialog.title}</h3>
            {dialog.message ? <p>{dialog.message}</p> : null}
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => close(false)}>
                {dialog.cancelText ?? "Cancel"}
              </button>
              <button
                className={`btn ${dialog.destructive ? "danger" : ""}`}
                onClick={() => close(true)}
              >
                {dialog.confirmText ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
