import { BrowserRouter, Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/results" element={<Results />} />
        <Route path="/upload-history" element={<UploadHistory />} />
        <Route path="/jobs" element={<JobCenter />} />
        <Route path="/interview" element={<InterviewPrep />} />
        <Route path="/chat" element={<AIChatbot />} />
        <Route path="/edit" element={<ResumeEditor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
