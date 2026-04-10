import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./auth/AuthContext";
import Sidebar from "./Components/Sidebar";
import LoginPage from "./pages/LoginPage";
import DashboardView from "./pages/DashboardView";
import UploadView from "./pages/UploadView";
import RiskClassificationView from "./pages/RiskClassificationView";
import ReviewQueueView from "./pages/ReviewQueueView";
import ReviewDetailView from "./pages/ReviewDetailView";
import SettingsView from "./pages/SettingsView";

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardView />} />
                  <Route path="/upload" element={<UploadView />} />
                  <Route path="/risk-classification" element={<RiskClassificationView />} />
                  <Route path="/reviews" element={<ReviewQueueView />} />
                  <Route path="/reviews/:reviewId" element={<ReviewDetailView />} />
                  <Route path="/settings" element={<SettingsView />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
