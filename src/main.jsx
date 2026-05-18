import React from "react";
import { createRoot } from "react-dom/client";
import HayangaGrandmaAIApp from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HayangaGrandmaAIApp />
  </React.StrictMode>
);
