import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { clearAuth, getToken, setAuthErrorHandler } from "@/store/auth";
import { UIProvider } from "@/components/ui";
import TabLayout from "@/components/TabLayout";
import RequireAuth from "@/components/RequireAuth";
import Login from "@/pages/Login";
import Confirm from "@/pages/Confirm";
import Portfolio from "@/pages/Portfolio";
import Broker from "@/pages/Broker";

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // On any 401, drop the session and bounce to login.
    setAuthErrorHandler(() => {
      clearAuth();
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  return (
    <UIProvider>
      <Routes>
        {/* Entry gate: dashboard if logged in, else login. */}
        <Route path="/" element={<Navigate to={getToken() ? "/orders" : "/login"} replace />} />
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <RequireAuth>
              <TabLayout />
            </RequireAuth>
          }
        >
          <Route path="/orders" element={<Confirm />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/broker" element={<Broker />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UIProvider>
  );
}
