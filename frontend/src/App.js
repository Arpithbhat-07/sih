import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import CommandCenter from "@/pages/CommandCenter";
import RiskMonitor from "@/pages/RiskMonitor";
import WorkInvestigation from "@/pages/WorkInvestigation";
import ComparePage from "@/pages/ComparePage";
import WorkExplorer from "@/pages/WorkExplorer";
import Analytics from "@/pages/Analytics";
import Alerts from "@/pages/Alerts";
import Agencies from "@/pages/Agencies";
import Districts from "@/pages/Districts";
import Investigations from "@/pages/Investigations";
import SentinelAI from "@/pages/SentinelAI";
import DataHealth from "@/pages/DataHealth";
import Settings from "@/pages/Settings";
import Relationships from "@/pages/Relationships";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#121417",
              border: "1px solid #272A30",
              color: "#EDEDED",
              fontFamily: "IBM Plex Sans, sans-serif",
            },
          }}
        />
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Role-Protected Jurisdictional Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<CommandCenter />} />
              <Route path="/risk" element={<RiskMonitor />} />
              <Route path="/works" element={<WorkExplorer />} />
              <Route path="/works/:id" element={<WorkInvestigation />} />
              <Route path="/tenders" element={<WorkExplorer />} />
              <Route path="/tenders/:id" element={<WorkInvestigation />} />
              <Route path="/compare/:idA/:idB" element={<ComparePage />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/agencies" element={<Agencies />} />
              <Route path="/agencies/:id" element={<Agencies />} />
              <Route path="/vendors" element={<Agencies />} />
              <Route path="/vendors/:id" element={<Agencies />} />
              <Route path="/relationships" element={<Relationships />} />
              <Route path="/network" element={<Relationships />} />
              <Route path="/districts" element={<Districts />} />
              <Route path="/investigations" element={<Investigations />} />
              <Route path="/ai" element={<SentinelAI />} />
              <Route path="/data-health" element={<DataHealth />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
