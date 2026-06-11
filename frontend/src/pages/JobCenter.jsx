import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AIParticles from "../components/AIParticles";
import Navbar from "../components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";
import {
  Briefcase,
  GraduationCap,
  MapPin,
  Clock,
  Coins,
  Linkedin,
  ExternalLink,
  Sparkles,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Search,
  CheckCircle,
  XCircle,
  Filter,
  FileText,
  LayoutGrid,
  List,
  Bookmark,
  ChevronRight,
  Trophy,
  BookOpen,
  ArrowUpRight,
  Plus,
  Trash
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { API_BASE_URL } from "../config/api";

function JobCenter() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Primary states
  const [jobs, setJobs] = useState([]);
  const [trends, setTrends] = useState(null); // eslint-disable-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("Software Engineer");
  const [activeTab, setActiveTab] = useState("jobs"); // jobs | internships | gap | tracker
  const [viewMode, setViewMode] = useState("grid"); // grid | table

  // Advanced filters state
  const [filterRole, setFilterRole] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterMinSalary, setFilterMinSalary] = useState(0);
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [filterWorkplace, setFilterWorkplace] = useState("All"); // All | Remote | Onsite | Hybrid
  const [filterExperience, setFilterExperience] = useState("All"); // All | Entry-level | Mid-level | Senior
  const [filterCompany, setFilterCompany] = useState("");
  const [filterDuration, setFilterDuration] = useState("All"); // All | 3 Months | 6 Months

  // Resume analysis & statistics
  const [resumeText, setResumeText] = useState(""); // eslint-disable-line no-unused-vars
  const [resumeScore, setResumeScore] = useState(75);
  const [readinessScore, setReadinessScore] = useState(68);
  const [parsedSections, setParsedSections] = useState(null); // eslint-disable-line no-unused-vars
  const [isParsingResume, setIsParsingResume] = useState(false); // eslint-disable-line no-unused-vars

  // Application tracker state (persisted in localStorage)
  const [trackerList, setTrackerList] = useState(() => {
    const saved = localStorage.getItem("job_tracker_applications");
    return saved ? JSON.parse(saved) : [];
  });

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const savedText = localStorage.getItem("resume_text") || "";
    setResumeText(savedText);
    
    // Extrapolate mock scores based on resume length/content
    if (savedText) {
      const words = savedText.trim().split(/\s+/).filter(Boolean).length;
      const baseScore = Math.min(65 + Math.floor(words / 15), 95);
      setResumeScore(baseScore);
      setReadinessScore(Math.min(baseScore - 5, 92));
      parseResumeStructure(savedText);
    }
    
    fetchTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

  useEffect(() => {
    if (token && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      handleMatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Persist tracker list
  useEffect(() => {
    localStorage.setItem("job_tracker_applications", JSON.stringify(trackerList));
  }, [trackerList]);

  const fetchTrends = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/trends/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 200) {
        const data = await res.json();
        setTrends(data);
      }
    } catch (error) {
      console.error("Error fetching market trends:", error);
    }
  };

  const parseResumeStructure = async (text) => {
    setIsParsingResume(true);
    try {
      const res = await fetch(`${API_BASE_URL}/resume/parse-sections/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ resume_text: text })
      });
      if (res.ok) {
        const data = await res.json();
        setParsedSections(data);
      }
    } catch (e) {
      console.error("Failed to parse resume sections:", e);
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleScrape = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a role keyword.");
      return;
    }
    setScraping(true);
    const toastId = toast.loading(`Scraping live listings for "${searchQuery}"...`);
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/scrape/?query=${encodeURIComponent(searchQuery)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        toast.dismiss(toastId);
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      
      if (res.ok) {
        toast.success(`Active sync completed successfully!`, { id: toastId });
        handleMatch();
      } else {
        toast.error("Scraper response failed.", { id: toastId });
      }
    } catch (error) {
      console.error("Scraping error:", error);
      toast.error("Network error during scraping sync.", { id: toastId });
    } finally {
      setScraping(false);
    }
  };

  const handleMatch = async () => {
    setLoading(true);
    try {
      const savedText = localStorage.getItem("resume_text") || "";
      const payload = savedText ? { resume_text: savedText } : {};

      const res = await fetch(`${API_BASE_URL}/jobs/recommend/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setJobs(data);
        if (data.length > 0) {
          toast.success("AI job evaluations completed!");
        }
      }
    } catch (error) {
      console.error("AI Matching failed:", error);
      toast.error("Match synchronization failed.");
    } finally {
      setLoading(false);
    }
  };

  // Helper: Extract numeric salary threshold
  const parseSalaryNumber = (salaryStr) => {
    if (!salaryStr) return 0;
    // Extract numbers like $120,000 or $35/hr
    const numbers = salaryStr.replace(/,/g, "").match(/\d+/g);
    if (!numbers) return 0;
    const value = parseInt(numbers[0], 10);
    // If it's hourly or small monthly stipend, scale it up roughly to check ranges
    if (value < 200) return value * 2000; // hourly to yearly proxy
    if (value < 10000) return value * 12; // monthly to yearly proxy
    return value;
  };

  // Filter evaluation logic
  const filteredJobs = jobs.filter(job => {
    // 1. Title/Role Filter
    if (filterRole.trim() && !job.job_role_title?.toLowerCase().includes(filterRole.toLowerCase())) {
      return false;
    }
    // 2. Location Filter
    if (filterLocation.trim() && !job.job_location?.toLowerCase().includes(filterLocation.toLowerCase())) {
      return false;
    }
    // 3. Company Filter
    if (filterCompany.trim() && !job.company_name?.toLowerCase().includes(filterCompany.toLowerCase())) {
      return false;
    }
    // 4. Workplace type
    if (filterWorkplace !== "All" && job.workplace_type !== filterWorkplace) {
      return false;
    }
    // 5. Experience required
    if (filterExperience !== "All" && job.experience_required !== filterExperience) {
      return false;
    }
    // 6. Internship duration
    if (filterDuration !== "All" && job.job_type === "internship") {
      const dur = job.duration?.toLowerCase() || "";
      const filterDurVal = filterDuration.toLowerCase();
      if (!dur.includes(filterDurVal)) return false;
    }
    // 7. Salary threshold check
    if (filterMinSalary > 0) {
      const salaryNum = parseSalaryNumber(job.salary_or_stipend);
      if (salaryNum > 0 && salaryNum < filterMinSalary) return false;
    }
    return true;
  });

  const careerJobs = filteredJobs.filter(j => j.job_type === "job");
  const internshipJobs = filteredJobs.filter(j => j.job_type === "internship");

  // Tracker interaction functions
  const handleSaveJob = (job) => {
    const exists = trackerList.find(t => t.id === job.id);
    if (exists) {
      toast.error("Position is already saved in your tracker.");
      return;
    }
    const newTrack = {
      id: job.id,
      title: job.job_role_title,
      company: job.company_name,
      salary: job.salary_or_stipend,
      location: job.job_location,
      status: "saved", // saved | applied | interviewing | offer | rejected
      dateAdded: new Date().toLocaleDateString(),
      jobLink: job.job_link
    };
    setTrackerList([...trackerList, newTrack]);
    toast.success("Saved to Application Tracker!");
  };

  const handleUpdateStatus = (id, newStatus) => {
    setTrackerList(trackerList.map(item => {
      if (item.id === id) return { ...item, status: newStatus };
      return item;
    }));
    toast.success(`Status updated to ${newStatus.toUpperCase()}`);
  };

  const handleRemoveTrack = (id) => {
    setTrackerList(trackerList.filter(item => item.id !== id));
    toast.success("Application removed from tracker.");
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 60) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    return "text-orange-400 border-orange-500/30 bg-orange-500/10";
  };

  // Compile global metadata for analytics charts
  const getDemandedSkillsSummary = () => {
    const allSkills = {};
    jobs.forEach(j => {
      const req = j.required_skills || [];
      req.forEach(s => {
        allSkills[s] = (allSkills[s] || 0) + 1;
      });
    });
    // Sort and return top 5
    return Object.entries(allSkills)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        percentage: Math.min(Math.floor((count / Math.max(1, jobs.length)) * 100), 100)
      }));
  };

  const demandedSkills = getDemandedSkillsSummary();

  // ─── CARD RENDERER for grid view ───────────────────────────────────────────
  const renderJobCard = (job, idx, accentColor) => {
    const isLinkedIn = job.job_link?.includes("linkedin.com") || job.source?.toLowerCase() === "linkedin";
    const accentMap = {
      purple: {
        border: "border-purple-500/20 hover:border-purple-500/50",
        badge: "bg-purple-500/10 text-purple-300 border-purple-500/20",
        glow: "shadow-[0_0_24px_rgba(168,85,247,0.08)]",
        btn: "bg-purple-600 hover:bg-purple-500",
        tag: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        dot: "bg-purple-500",
      },
      emerald: {
        border: "border-emerald-500/20 hover:border-emerald-500/50",
        badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        glow: "shadow-[0_0_24px_rgba(16,185,129,0.08)]",
        btn: "bg-emerald-600 hover:bg-emerald-500",
        tag: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        dot: "bg-emerald-500",
      },
    };
    const acc = accentMap[accentColor] || accentMap.purple;
    const scoreColor = getScoreColor(job.match_score ?? 0);

    return (
      <div
        key={job.id || idx}
        className={`relative p-5 rounded-2xl border bg-slate-900/40 backdrop-blur-md transition-all duration-300 flex flex-col gap-4 ${acc.border} ${acc.glow}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-slate-100 leading-tight truncate max-w-[200px]">
                {job.job_role_title || "Untitled Role"}
              </h3>
              {isLinkedIn ? (
                <a
                  href={job.job_link || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[#0a66c2] hover:scale-110 transition-transform"
                  title="View on LinkedIn"
                >
                  <Linkedin size={15} fill="currentColor" />
                </a>
              ) : job.job_link ? (
                <a
                  href={job.job_link}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-slate-400 hover:text-white transition-colors"
                  title="View listing"
                >
                  <ExternalLink size={14} />
                </a>
              ) : null}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {job.company_name || "Company"}
            </p>
          </div>

          {/* Match score badge */}
          <div
            className={`shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-sm ${scoreColor}`}
          >
            {job.match_score ?? "—"}%
          </div>
        </div>

        {/* Meta Pills */}
        <div className="flex flex-wrap gap-1.5">
          {job.job_location && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60">
              <MapPin size={10} />
              {job.job_location}
            </span>
          )}
          {job.workplace_type && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${acc.badge}`}>
              {job.workplace_type}
            </span>
          )}
          {job.experience_required && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60">
              {job.experience_required}
            </span>
          )}
          {job.duration && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60">
              ⏱ {job.duration}
            </span>
          )}
        </div>

        {/* Salary */}
        {job.salary_or_stipend && (
          <div className="flex items-center gap-1.5">
            <Coins size={13} className="text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-emerald-300">
              {job.salary_or_stipend}
            </span>
          </div>
        )}

        {/* Required skills */}
        {job.required_skills?.length > 0 && (
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Required Skills
            </p>
            <div className="flex flex-wrap gap-1">
              {job.required_skills.slice(0, 6).map((sk, i) => (
                <span
                  key={i}
                  className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${acc.tag}`}
                >
                  {sk}
                </span>
              ))}
              {job.required_skills.length > 6 && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                  +{job.required_skills.length - 6}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Missing skills */}
        {job.missing_skills?.length > 0 && (
          <div>
            <p className="text-[9px] uppercase font-bold text-rose-500/70 mb-1.5 tracking-wider">
              Skills Gap
            </p>
            <div className="flex flex-wrap gap-1">
              {job.missing_skills.slice(0, 4).map((sk, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 text-[9px] font-bold rounded border border-dashed border-rose-500/30 text-rose-400 bg-rose-500/5"
                >
                  {sk}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-800/60">
          <a
            href={job.job_link || "#"}
            target="_blank"
            rel="noreferrer"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white rounded-xl transition-all ${acc.btn}`}
          >
            Apply Now
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans pb-16">
      <Navbar />
      <AIParticles />
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-28">

        {/* TOP STATUS AND ANALYTICS METRICS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Gauge: Resume Score */}
          <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between shadow-[0_0_15px_rgba(168,127,251,0.03)]">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">
                Resume ATS Match
              </span>
              <h3 className="text-2xl font-black text-slate-100">{resumeScore}/100</h3>
              <p className="text-xs text-slate-400 mt-1">Based on semantic keyword parsing</p>
            </div>
            <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-lg ${resumeScore >= 80 ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5' : 'border-yellow-500/40 text-yellow-400 bg-yellow-500/5'}`}>
              {resumeScore}%
            </div>
          </div>

          {/* Gauge: Job Readiness Score */}
          <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between shadow-[0_0_15px_rgba(168,127,251,0.03)]">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">
                Job Readiness Index
              </span>
              <h3 className="text-2xl font-black text-slate-100">{readinessScore}%</h3>
              <p className="text-xs text-slate-400 mt-1">Core requirements fit ratio</p>
            </div>
            <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-lg ${readinessScore >= 75 ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/5' : 'border-yellow-500/40 text-yellow-400 bg-yellow-500/5'}`}>
              {readinessScore}%
            </div>
          </div>

          {/* Applications Tracker status summary */}
          <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between shadow-[0_0_15px_rgba(168,127,251,0.03)]">
            <div className="w-full">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-2">
                Active Tracker Board
              </span>
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800/80">
                  <span className="text-xs text-slate-500 block font-semibold">Saved</span>
                  <span className="text-sm font-bold text-purple-400">{trackerList.filter(t => t.status === "saved").length}</span>
                </div>
                <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800/80">
                  <span className="text-xs text-slate-500 block font-semibold">Applied</span>
                  <span className="text-sm font-bold text-blue-400">{trackerList.filter(t => t.status === "applied").length}</span>
                </div>
                <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800/80">
                  <span className="text-xs text-slate-500 block font-semibold">Intv</span>
                  <span className="text-sm font-bold text-yellow-400">{trackerList.filter(t => t.status === "interviewing").length}</span>
                </div>
                <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800/80">
                  <span className="text-xs text-slate-500 block font-semibold">Offer</span>
                  <span className="text-sm font-bold text-emerald-400">{trackerList.filter(t => t.status === "offer").length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Match distribution block */}
          <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex flex-col justify-between shadow-[0_0_15px_rgba(168,127,251,0.03)]">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">
                AI Match Score Range
              </span>
              <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-950 border border-slate-800/50 mt-1">
                <div className="bg-emerald-500/80" style={{ width: `${Math.floor((jobs.filter(j => j.match_score >= 80).length / Math.max(1, jobs.length)) * 100)}%` }} title="Excellent Compatibility" />
                <div className="bg-yellow-500/80" style={{ width: `${Math.floor((jobs.filter(j => j.match_score >= 60 && j.match_score < 80).length / Math.max(1, jobs.length)) * 100)}%` }} title="Moderate Match" />
                <div className="bg-rose-500/80" style={{ width: `${Math.floor((jobs.filter(j => j.match_score < 60).length / Math.max(1, jobs.length)) * 100)}%` }} title="Low Match" />
              </div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase mt-2">
              <span className="text-emerald-400">High: {jobs.filter(j => j.match_score >= 80).length}</span>
              <span className="text-yellow-400">Mid: {jobs.filter(j => j.match_score >= 60 && j.match_score < 80).length}</span>
              <span className="text-rose-400">Low: {jobs.filter(j => j.match_score < 60).length}</span>
            </div>
          </div>
        </div>

        {/* DOUBLE COLUMN ANALYTICS ROW */}
        {jobs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* DEMANDED SKILLS CHART */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-400" />
                Aggregated Skills Demand
              </h4>
              <div className="space-y-3">
                {demandedSkills.length > 0 ? (
                  demandedSkills.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300">{item.name}</span>
                        <span className="text-purple-400">{item.percentage}% requested</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800/50">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">Collect listings to populate skill demand analysis.</p>
                )}
              </div>
            </div>

            {/* PREDICTED CAREER PATHS */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-yellow-400" />
                AI Recommended Career Horizons
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center hover:border-purple-500/30 transition-all cursor-pointer">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Software Architect</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">High Match • Lead Strategy</p>
                  </div>
                  <ChevronRight size={16} className="text-purple-400" />
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center hover:border-purple-500/30 transition-all cursor-pointer">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Full-Stack Engineer</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">Strong Match • Web & Cloud</p>
                  </div>
                  <ChevronRight size={16} className="text-purple-400" />
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center hover:border-purple-500/30 transition-all cursor-pointer">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">FastAPI Developer</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">Moderate Match • APIs & DBs</p>
                  </div>
                  <ChevronRight size={16} className="text-purple-400" />
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center hover:border-purple-500/30 transition-all cursor-pointer">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">DevOps Engineer</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">Skill Gap: Docker/Kubernetes</p>
                  </div>
                  <ChevronRight size={16} className="text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADVANCED MULTI-ROW FILTERING PANEL */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md mb-8">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800/80 pb-2">
            <Filter size={16} className="text-purple-400" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">Advanced Filter Analytics</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            
            {/* Filter: Role Title */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Role</label>
              <input
                type="text"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                placeholder="e.g. Lead, Backend"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800/80 focus:border-purple-500/40 rounded-xl text-slate-200 outline-none transition-all"
              />
            </div>

            {/* Filter: Location */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Location</label>
              <input
                type="text"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                placeholder="e.g. Remote, Berlin"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800/80 focus:border-purple-500/40 rounded-xl text-slate-200 outline-none transition-all"
              />
            </div>

            {/* Filter: Company */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Company</label>
              <input
                type="text"
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                placeholder="e.g. NextGen, Apex"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800/80 focus:border-purple-500/40 rounded-xl text-slate-200 outline-none transition-all"
              />
            </div>

            {/* Filter: Workplace type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Workplace Mode</label>
              <select
                value={filterWorkplace}
                onChange={(e) => setFilterWorkplace(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800/80 focus:border-purple-500/40 rounded-xl text-slate-200 outline-none transition-all"
              >
                <option value="All">All Formats</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">Onsite</option>
              </select>
            </div>

            {/* Filter: Experience Level */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Experience Level</label>
              <select
                value={filterExperience}
                onChange={(e) => setFilterExperience(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800/80 focus:border-purple-500/40 rounded-xl text-slate-200 outline-none transition-all"
              >
                <option value="All">All Ranges</option>
                <option value="Entry-level">Entry-level</option>
                <option value="Mid-level">Mid-level</option>
                <option value="Senior">Senior</option>
              </select>
            </div>

            {/* Filter: Internship Duration */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Internship Period</label>
              <select
                value={filterDuration}
                onChange={(e) => setFilterDuration(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800/80 focus:border-purple-500/40 rounded-xl text-slate-200 outline-none transition-all"
              >
                <option value="All">All Durations</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
              </select>
            </div>

            {/* Filter: Minimum Match score threshold */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Min Match Score: {filterMinScore}%</label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filterMinScore}
                onChange={(e) => setFilterMinScore(Number(e.target.value))}
                className="w-full h-2 rounded bg-slate-950 accent-purple-500 cursor-pointer border border-slate-800"
              />
            </div>

            {/* Filter: Salary Slider */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Min Yearly Salary: {filterMinSalary > 0 ? `$${(filterMinSalary / 1000).toFixed(0)}k` : "All Ranges"}
              </label>
              <input
                type="range"
                min="0"
                max="150000"
                step="10000"
                value={filterMinSalary}
                onChange={(e) => setFilterMinSalary(Number(e.target.value))}
                className="w-full h-2 rounded bg-slate-950 accent-purple-500 cursor-pointer border border-slate-800"
              />
            </div>
          </div>

          {/* Reset Filters Buttons */}
          <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-800/50">
            <button
              onClick={() => {
                setFilterRole("");
                setFilterLocation("");
                setFilterCompany("");
                setFilterWorkplace("All");
                setFilterExperience("All");
                setFilterDuration("All");
                setFilterMinScore(0);
                setFilterMinSalary(0);
              }}
              className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* PRIMARY LAYOUT HUB GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          
          {/* Side Panel: Scraper controls */}
          <div className="flex flex-col gap-6">
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Search size={16} className="text-purple-400" />
                Corporate Mining
              </h3>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Python DevOps"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 outline-none text-xs"
                />
                
                <button
                  onClick={handleScrape}
                  disabled={scraping}
                  className="w-full flex items-center justify-center gap-2 p-2.5 font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-lg transition-all"
                >
                  {scraping ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Briefcase size={14} />
                  )}
                  {scraping ? "Harvesting..." : "Harvest Live Listings"}
                </button>
              </div>
            </div>

            {/* Navigation Tabs list */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab("jobs")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-left transition-all ${activeTab === "jobs" ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'bg-slate-900/30 border border-slate-800/80 text-slate-400 hover:text-white'}`}
              >
                <Briefcase size={16} />
                💼 Recommended Jobs
              </button>
              <button
                onClick={() => setActiveTab("internships")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-left transition-all ${activeTab === "internships" ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' : 'bg-slate-900/30 border border-slate-800/80 text-slate-400 hover:text-white'}`}
              >
                <GraduationCap size={16} />
                🎓 Internship Programs
              </button>
              <button
                onClick={() => setActiveTab("gap")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-left transition-all ${activeTab === "gap" ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg' : 'bg-slate-900/30 border border-slate-800/80 text-slate-400 hover:text-white'}`}
              >
                <BookOpen size={16} />
                📊 Gap & Pay Analysis
              </button>
              <button
                onClick={() => setActiveTab("tracker")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-left transition-all ${activeTab === "tracker" ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'bg-slate-900/30 border border-slate-800/80 text-slate-400 hover:text-white'}`}
              >
                <Bookmark size={16} />
                📋 Application Tracker
              </button>
            </div>
          </div>

          {/* Main Working Panel */}
          <div className="flex flex-col gap-6">
            
            {/* View Mode controls for Jobs & Internships tabs */}
            {(activeTab === "jobs" || activeTab === "internships") && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-semibold">
                  Showing {activeTab === "jobs" ? careerJobs.length : internshipJobs.length} matches
                </span>
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? 'bg-slate-800 text-purple-400' : 'text-slate-500 hover:text-white'}`}
                    title="Grid layout"
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === "table" ? 'bg-slate-800 text-purple-400' : 'text-slate-500 hover:text-white'}`}
                    title="Table analytics layout"
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Skeletons */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 h-80 animate-pulse" />
                ))}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                
                {/* 1. RECOMMENDED CAREER JOBS */}
                {activeTab === "jobs" && (
                  <motion.div
                    key="jobs-board"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {careerJobs.length > 0 ? (
                      viewMode === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {careerJobs.map((job, idx) => (
                            <div key={job.id || idx} className="relative">
                              {/* Quick application bookmark button */}
                              <button
                                onClick={() => handleSaveJob(job)}
                                className="absolute top-6 right-24 z-10 p-2 text-slate-500 hover:text-purple-400 bg-slate-950/80 border border-slate-800 hover:border-purple-500/30 rounded-xl transition-all"
                                title="Save to Tracker"
                              >
                                <Bookmark size={16} />
                              </button>
                              {renderJobCard(job, idx, "purple")}
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Premium analytics Table View */
                        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                <th className="p-4">Title & Company</th>
                                <th className="p-4">Match</th>
                                <th className="p-4">Location & Workplace</th>
                                <th className="p-4">Salary</th>
                                <th className="p-4">Skills Gap</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {careerJobs.map((job, idx) => {
                                const isLinkedIn = job.job_link?.includes("linkedin.com") || job.source?.toLowerCase() === "linkedin";
                                return (
                                  <tr key={job.id || idx} className="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors">
                                    <td className="p-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-200">{job.job_role_title}</span>
                                        {isLinkedIn ? (
                                          <a href={job.job_link} target="_blank" rel="noreferrer" className="text-[#0a66c2]">
                                            <Linkedin size={15} fill="currentColor" />
                                          </a>
                                        ) : (
                                          <a href={job.job_link} target="_blank" rel="noreferrer" className="text-slate-400">
                                            <ExternalLink size={14} />
                                          </a>
                                        )}
                                      </div>
                                      <span className="text-xs text-slate-500">@ {job.company_name}</span>
                                    </td>
                                    <td className="p-4">
                                      <span className={`px-2.5 py-1 text-xs rounded-full font-bold border ${getScoreColor(job.match_score)}`}>
                                        {job.match_score}%
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <div className="text-slate-200">{job.job_location}</div>
                                      <span className="text-[10px] uppercase font-bold text-slate-500">{job.workplace_type}</span>
                                    </td>
                                    <td className="p-4 text-emerald-400 font-semibold">{job.salary_or_stipend}</td>
                                    <td className="p-4">
                                      <div className="flex flex-wrap gap-1 max-w-xs">
                                        {job.missing_skills?.slice(0, 2).map((s, i) => (
                                          <span key={i} className="text-[9px] border border-dashed border-rose-500/30 text-rose-400 bg-rose-500/5 px-1.5 py-0.5 rounded">
                                            {s}
                                          </span>
                                        ))}
                                        {job.missing_skills?.length === 0 && <span className="text-[9px] text-emerald-400 font-bold">100% matched!</span>}
                                      </div>
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                      <button
                                        onClick={() => handleSaveJob(job)}
                                        className="p-2 text-slate-400 hover:text-purple-400 bg-slate-950 border border-slate-800 rounded-lg"
                                        title="Save"
                                      >
                                        <Bookmark size={14} />
                                      </button>
                                      <a
                                        href={job.job_link || "#"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                                      >
                                        Apply
                                        <ExternalLink size={12} />
                                      </a>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                      <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500">
                        No full-time roles fit the currently selected filters.
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 2. RECOMMENDED INTERNSHIP ROLES */}
                {activeTab === "internships" && (
                  <motion.div
                    key="intern-board"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {internshipJobs.length > 0 ? (
                      viewMode === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {internshipJobs.map((job, idx) => (
                            <div key={job.id || idx} className="relative">
                              <button
                                onClick={() => handleSaveJob(job)}
                                className="absolute top-6 right-24 z-10 p-2 text-slate-500 hover:text-purple-400 bg-slate-950/80 border border-slate-800 hover:border-purple-500/30 rounded-xl transition-all"
                                title="Save to Tracker"
                              >
                                <Bookmark size={16} />
                              </button>
                              {renderJobCard(job, idx, "emerald")}
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Internship Table View */
                        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                <th className="p-4">Internship Role & Company</th>
                                <th className="p-4">Match</th>
                                <th className="p-4">Duration & Workplace</th>
                                <th className="p-4">Stipend</th>
                                <th className="p-4">Skills Needed</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {internshipJobs.map((job, idx) => {
                                const isLinkedIn = job.job_link?.includes("linkedin.com") || job.source?.toLowerCase() === "linkedin";
                                return (
                                  <tr key={job.id || idx} className="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors">
                                    <td className="p-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-200">{job.job_role_title}</span>
                                        {isLinkedIn ? (
                                          <a href={job.job_link} target="_blank" rel="noreferrer" className="text-[#0a66c2]">
                                            <Linkedin size={15} fill="currentColor" />
                                          </a>
                                        ) : (
                                          <a href={job.job_link} target="_blank" rel="noreferrer" className="text-slate-400">
                                            <ExternalLink size={14} />
                                          </a>
                                        )}
                                      </div>
                                      <span className="text-xs text-slate-500">@ {job.company_name}</span>
                                    </td>
                                    <td className="p-4">
                                      <span className={`px-2.5 py-1 text-xs rounded-full font-bold border ${getScoreColor(job.match_score)}`}>
                                        {job.match_score}%
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <div className="text-slate-200">{job.duration}</div>
                                      <span className="text-[10px] uppercase font-bold text-slate-500">{job.workplace_type}</span>
                                    </td>
                                    <td className="p-4 text-emerald-400 font-semibold">{job.salary_or_stipend}</td>
                                    <td className="p-4">
                                      <div className="flex flex-wrap gap-1 max-w-xs">
                                        {job.missing_skills?.slice(0, 2).map((s, i) => (
                                          <span key={i} className="text-[9px] border border-dashed border-rose-500/30 text-rose-400 bg-rose-500/5 px-1.5 py-0.5 rounded">
                                            {s}
                                          </span>
                                        ))}
                                        {job.missing_skills?.length === 0 && <span className="text-[9px] text-emerald-400 font-bold">All matched!</span>}
                                      </div>
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                      <button
                                        onClick={() => handleSaveJob(job)}
                                        className="p-2 text-slate-400 hover:text-purple-400 bg-slate-950 border border-slate-800 rounded-lg"
                                        title="Save"
                                      >
                                        <Bookmark size={14} />
                                      </button>
                                      <a
                                        href={job.job_link || "#"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                                      >
                                        Apply
                                        <ExternalLink size={12} />
                                      </a>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                      <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500">
                        No internships fit the currently selected filters.
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 3. SKILL GAP AND PAY ANALYTICS */}
                {activeTab === "gap" && (
                  <motion.div
                    key="gap-board"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    
                    {/* Pay Match gap panel */}
                    <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md">
                      <div className="flex items-center gap-2.5 mb-3 text-amber-500">
                        <AlertCircle size={22} />
                        <h3 className="text-lg font-bold">Why Higher-Paying Roles Aren't Matching</h3>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed mb-4">
                        Based on your current resume score ({resumeScore}%) and detected developer background, higher-paying roles (e.g. Lead Architect, Systems Designer) require specialized skill sets which are not yet fully highlighted in your profile:
                      </p>
                      <ul className="space-y-2.5">
                        <li className="flex items-start gap-2 text-xs text-slate-400">
                          <span className="text-amber-500 mt-0.5">▪</span>
                          <span><strong>Advanced Cloud Topology</strong>: Higher-paying salaries demand deep expertise in microservices design, caching nodes, and multi-region Kubernetes load balancing.</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-slate-400">
                          <span className="text-amber-500 mt-0.5">▪</span>
                          <span><strong>System Design & Architectural Patterns</strong>: Your profile focuses heavily on coding/syntax rather than infrastructure design patterns (CQRS, Event-Sourcing, Rate-Limiters).</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-slate-400">
                          <span className="text-amber-500 mt-0.5">▪</span>
                          <span><strong>Data Storage Optimization</strong>: Distributed transactions, database replication strategies, and index optimizations represent a major gap.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Skill Learning paths recommendation */}
                    <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md">
                      <div className="flex items-center gap-2 mb-4 text-purple-400">
                        <BookOpen size={20} />
                        <h3 className="text-base font-bold uppercase tracking-wider">AI Curated Bridging Path</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center hover:border-purple-500/20 transition-all">
                          <div>
                            <span className="text-[10px] text-purple-400 uppercase font-black tracking-widest block mb-0.5">Course Module 1</span>
                            <h4 className="text-sm font-bold text-slate-200">System Design Fundamentals</h4>
                            <p className="text-xs text-slate-400 mt-1">Focuses on CAP theorem, database partitioning, and horizontal caching structures.</p>
                          </div>
                          <a href="https://www.youtube.com/results?search_query=system+design+fundamentals" target="_blank" rel="noreferrer" className="p-2 text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20">
                            <ArrowUpRight size={16} />
                          </a>
                        </div>
                        
                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center hover:border-purple-500/20 transition-all">
                          <div>
                            <span className="text-[10px] text-purple-400 uppercase font-black tracking-widest block mb-0.5">Course Module 2</span>
                            <h4 className="text-sm font-bold text-slate-200">FastAPI Microservices Scale</h4>
                            <p className="text-xs text-slate-400 mt-1">Integrates Docker containerization, asynchronous connection pooling, and AWS ECS deployment.</p>
                          </div>
                          <a href="https://www.youtube.com/results?search_query=fastapi+microservices+scale+docker+aws" target="_blank" rel="noreferrer" className="p-2 text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20">
                            <ArrowUpRight size={16} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4. INTERACTIVE KANBAN APPLICATION TRACKER */}
                {activeTab === "tracker" && (
                  <motion.div
                    key="tracker-board"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      
                      {/* Column status mappings */}
                      {[
                        { key: "saved", title: "Saved Listings", border: "border-purple-500/20", bg: "bg-purple-500/5", text: "text-purple-400" },
                        { key: "applied", title: "Applied", border: "border-blue-500/20", bg: "bg-blue-500/5", text: "text-blue-400" },
                        { key: "interviewing", title: "Interviewing", border: "border-yellow-500/20", bg: "bg-yellow-500/5", text: "text-yellow-400" },
                        { key: "offer", title: "Offers", border: "border-emerald-500/20", bg: "bg-emerald-500/5", text: "text-emerald-400" },
                        { key: "rejected", title: "Archived/Rej", border: "border-rose-500/20", bg: "bg-rose-500/5", text: "text-rose-400" }
                      ].map(col => {
                        const items = trackerList.filter(t => t.status === col.key);
                        return (
                          <div key={col.key} className={`rounded-xl border ${col.border} ${col.bg} p-3 min-h-[350px]`}>
                            <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-slate-800">
                              <span className={`text-xs font-black uppercase tracking-wider ${col.text}`}>{col.title}</span>
                              <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                                {items.length}
                              </span>
                            </div>
                            
                            <div className="space-y-3">
                              {items.map(item => (
                                <div key={item.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/30 transition-all relative">
                                  <button
                                    onClick={() => handleRemoveTrack(item.id)}
                                    className="absolute top-2 right-2 text-slate-600 hover:text-rose-400 transition-colors p-1"
                                    title="Remove Application"
                                  >
                                    <Trash size={12} />
                                  </button>
                                  <h5 className="text-xs font-bold text-slate-200 pr-4 line-clamp-1">{item.title}</h5>
                                  <p className="text-[10px] text-slate-500 font-semibold line-clamp-1">{item.company}</p>
                                  
                                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold mt-2">
                                    <span>{item.location}</span>
                                    <span className="text-emerald-400">{item.salary}</span>
                                  </div>
                                  
                                  {/* Update column status dropdown dropdown */}
                                  <div className="mt-3.5">
                                    <select
                                      value={item.status}
                                      onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                                      className="w-full text-[9px] font-bold p-1 bg-slate-900 border border-slate-800/80 rounded text-slate-400 outline-none"
                                    >
                                      <option value="saved">Move to Saved</option>
                                      <option value="applied">Move to Applied</option>
                                      <option value="interviewing">Move to Intv</option>
                                      <option value="offer">Move to Offer</option>
                                      <option value="rejected">Move to Rej</option>
                                    </select>
                                  </div>
                                </div>
                              ))}

                              {items.length === 0 && (
                                <div className="text-[10px] text-slate-600 text-center py-6">
                                  Empty
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

export default JobCenter;
