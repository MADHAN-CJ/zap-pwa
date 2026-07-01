import { Navigate } from "react-router-dom";
import { getToken } from "@/store/auth";
import type { ReactNode } from "react";

// Route gate — bounce to /login if there is no stored token. The API client's
// global 401 handler (wired in App) covers tokens that expire mid-session.
export default function RequireAuth({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
