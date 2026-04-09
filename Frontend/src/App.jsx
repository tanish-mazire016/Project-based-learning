import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Components/Sidebar";
import UploadView from "./pages/UploadView";
import ReviewQueueView from "./pages/ReviewQueueView";
import ReviewDetailView from "./pages/ReviewDetailView";
import SettingsView from "./pages/SettingsView";

function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<UploadView />} />
          <Route path="/reviews" element={<ReviewQueueView />} />
          <Route path="/reviews/:reviewId" element={<ReviewDetailView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
