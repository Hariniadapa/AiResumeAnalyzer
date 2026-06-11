import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Results from "./pages/Results.jsx";
import UploadHistory from "./pages/UploadHistory.jsx";
import JobCenter from "./pages/JobCenter.jsx";
import InterviewPrep from "./pages/InterviewPrep.jsx";
import AIChatbot from "./pages/AIChatbot.jsx";
import ResumeEditor from "./pages/ResumeEditor.jsx";
import AIDiagnostics from "./pages/AIDiagnostics.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
          style: {
              background: '#1e293b',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
          },
      }} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/results" element={<Results />} />
        <Route path="/upload-history" element={<UploadHistory />} />
        <Route path="/jobs" element={<ErrorBoundary><JobCenter /></ErrorBoundary>} />
        <Route path="/interview" element={<InterviewPrep />} />
        <Route path="/chat" element={<AIChatbot />} />
        <Route path="/edit" element={<ResumeEditor />} />
        <Route path="/debug/ai" element={<AIDiagnostics />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
