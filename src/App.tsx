import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { applyTheme } from "@/lib/theme";
import { getToken } from "@/store/auth";
import { MOCK } from "@/api/watch";
import { TabBar } from "@/components/TabBar";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Digest from "@/pages/Digest";
import AddPick from "@/pages/AddPick";
import AddInterview from "@/pages/AddInterview";
import AddConfirm from "@/pages/AddConfirm";
import WatchDetail from "@/pages/WatchDetail";
import WatchAsk from "@/pages/WatchAsk";

/** Auth gate — demo (mock) mode is open; real-API mode requires a token. */
function Auth({ children }: { children: ReactNode }) {
  if (!MOCK && !getToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  useEffect(() => applyTheme(), []);
  const showTabs = ["/", "/watch", "/digest"].includes(location.pathname);
  return (
    <>
      <AnimatePresence mode="popLayout" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/watch" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/watch" element={<Auth><Home /></Auth>} />
          <Route path="/watch/new" element={<Auth><AddPick /></Auth>} />
          <Route path="/watch/new/interview" element={<Auth><AddInterview /></Auth>} />
          <Route path="/watch/new/confirm" element={<Auth><AddConfirm /></Auth>} />
          <Route path="/watch/:id" element={<Auth><WatchDetail /></Auth>} />
          <Route path="/watch/:id/ask" element={<Auth><WatchAsk /></Auth>} />
          <Route path="/digest" element={<Auth><Digest /></Auth>} />
          <Route path="*" element={<Navigate to="/watch" replace />} />
        </Routes>
      </AnimatePresence>
      {showTabs && <TabBar />}
    </>
  );
}
