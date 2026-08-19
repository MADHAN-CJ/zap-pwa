import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { applyTheme } from "@/lib/theme";
import { TabBar } from "@/components/TabBar";
import Home from "@/pages/Home";
import Digest from "@/pages/Digest";
import AddPick from "@/pages/AddPick";
import AddInterview from "@/pages/AddInterview";
import AddConfirm from "@/pages/AddConfirm";
import WatchDetail from "@/pages/WatchDetail";
import WatchAsk from "@/pages/WatchAsk";

export default function App() {
  const location = useLocation();
  useEffect(() => applyTheme(), []);
  const showTabs = ["/", "/watch", "/digest"].includes(location.pathname);
  return (
    <>
      <AnimatePresence mode="popLayout" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/watch" replace />} />
          <Route path="/watch" element={<Home />} />
          <Route path="/watch/new" element={<AddPick />} />
          <Route path="/watch/new/interview" element={<AddInterview />} />
          <Route path="/watch/new/confirm" element={<AddConfirm />} />
          <Route path="/watch/:id" element={<WatchDetail />} />
          <Route path="/watch/:id/ask" element={<WatchAsk />} />
          <Route path="/digest" element={<Digest />} />
          <Route path="*" element={<Navigate to="/watch" replace />} />
        </Routes>
      </AnimatePresence>
      {showTabs && <TabBar />}
    </>
  );
}
