import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./theme.css";

// Router basename mirrors the build-time base path (for sub-path hosting).
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
