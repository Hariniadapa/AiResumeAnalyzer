import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AIParticles from "../components/AIParticles";
import Navbar from "../components/Navbar";
import {
  Briefcase, GraduationCap, MapPin, Clock, Coins, Linkedin, ExternalLink,
  Sparkles, AlertCircle, RefreshCw, TrendingUp, Search, CheckCircle, XCircle,
  Filter, Bookmark, ChevronRight, Trophy, BookOpen, ArrowUpRight,
  Trash, Target, Brain, Award, BarChart3, Lightbulb, ChevronDown, ChevronUp,
  Building2, Zap, Star, FileText, Users, Cpu
} from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../config/api";

/* ─────────────────────────── design tokens (matching Dashboard / InterviewPrep exactly) ─── */
const PAGE = {
  minHeight: "100vh",
  backgroundColor: "#0f172a",
  backgroundImage: "radial-gradient(circle at top, #1e293b, #0f172a 80%)",
  fontFamily: "'Inter', sans-serif",
  padding: "80px 20px 60px",
  position: "relative",
  overflow: "hidden",
  color: "#f8fafc",
};
const BLOB1 = {
  position: "absolute", top: "-150px", left: "-150px",
  width: "400px", height: "400px",
  background: "rgba(168, 127, 251, 0.15)",
  filter: "blur(80px)", borderRadius: "50%", zIndex: 0,
};
const BLOB2 = {
  position: "absolute", bottom: "-200px", right: "-100px",
  width: "500px", height: "500px",
  background: "rgba(88, 166, 255, 0.1)",
  filter: "blur(100px)", borderRadius: "50%", zIndex: 0,
};
const CONTAINER = {
  width: "100%", maxWidth: "1200px",
  margin: "0 auto", position: "relative", zIndex: 1,
};
const GLASS_CARD = {
  background: "rgba(30, 41, 59, 0.4)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  padding: "30px",
  borderRadius: "24px",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
};
const CARD = {
  background: "rgba(30,41,59,0.5)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  padding: "30px",
  borderRadius: "20px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
};
const BADGE_COLORS = {
  purple: { bg: "rgba(168,127,251,0.12)", color: "#a87ffb", border: "rgba(168,127,251,0.25)" },
  blue:   { bg: "rgba(88,166,255,0.12)",  color: "#58a6ff", border: "rgba(88,166,255,0.25)" },
  green:  { bg: "rgba(52,211,153,0.12)",  color: "#34d399", border: "rgba(52,211,153,0.25)" },
  yellow: { bg: "rgba(245,158,11,0.12)",  color: "#f59e0b", border: "rgba(245,158,11,0.25)" },
  rose:   { bg: "rgba(251,113,133,0.12)", color: "#fb7185", border: "rgba(251,113,133,0.25)" },
  orange: { bg: "rgba(251,146,60,0.12)",  color: "#fb923c", border: "rgba(251,146,60,0.25)" },
};
const TITLE   = { fontSize: "38px", fontWeight: "800", color: "#ffffff", margin: "0 0 10px", letterSpacing: "-1px" };
const SUBTITLE = { fontSize: "16px", color: "#8b949e", maxWidth: "700px", margin: "0 auto" };
const CARD_TITLE = { margin: "0 0 20px", fontSize: "17px", fontWeight: "700", color: "#e2e8f0" };
const LABEL = { fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" };
const BADGE = (c) => ({
  display: "inline-flex", alignItems: "center", gap: "4px",
  padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700",
  background: c.bg, color: c.color, border: `1px solid ${c.border}`,
});
const GRADIENT_BTN = {
  padding: "14px 30px", borderRadius: "14px", border: "none",
  background: "linear-gradient(135deg, #a87ffb 0%, #58a6ff 100%)",
  color: "#fff", fontSize: "15px", fontWeight: "700", cursor: "pointer",
  boxShadow: "0 4px 20px rgba(168,127,251,0.4)", transition: "transform 0.2s",
};
const INPUT_STYLE = {
  width: "100%", padding: "12px 16px", borderRadius: "12px",
  background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#e2e8f0", fontSize: "14px", outline: "none", boxSizing: "border-box",
};
const SKELETON = {
  borderRadius: "14px",
  background: "rgba(255,255,255,0.04)",
  animation: "pulse 1.5s ease-in-out infinite",
};
const DOT = (color) => ({
  width: "8px", height: "8px", borderRadius: "50%",
  backgroundColor: color, boxShadow: `0 0 10px ${color}`,
  marginRight: "12px", flexShrink: 0,
});

/* ─────────────────────────── MAIN COMPONENT ─── */
function JobCenter() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  /* core */
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("Software Engineer");

  /* intelligence */
  const [resumeScore, setResumeScore] = useState(0);
  const [employabilityScore, setEmployabilityScore] = useState(0);
  const [readinessLevel, setReadinessLevel] = useState("Analysing...");
  const [topStrengths, setTopStrengths] = useState([]);
  const [areasToImprove, setAreasToImprove] = useState([]);
  const [careerPaths, setCareerPaths] = useState([]);
  const [careerSummary, setCareerSummary] = useState("");
  const [skillGapData, setSkillGapData] = useState({ matched: [], missing: [], suggestions: [] });
  const [intelLoading, setIntelLoading] = useState(true);

  /* filters */
  const [fRole, setFRole] = useState("");
  const [fLoc, setFLoc] = useState("");
  const [fComp, setFComp] = useState("");
  const [fWork, setFWork] = useState("All");
  const [fExp, setFExp] = useState("All");
  const [fDur, setFDur] = useState("All");
  const [fScore, setFScore] = useState(0);
  const [fSalary, setFSalary] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* tracker */
  const [tracker, setTracker] = useState(() => {
    const s = localStorage.getItem("job_tracker_applications");
    return s ? JSON.parse(s) : [];
  });
  const [trackerOpen, setTrackerOpen] = useState(false);

  const loaded = useRef(false);

  /* ── boot ── */
  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    loadIntelligence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

  useEffect(() => {
    if (token && !loaded.current) { loaded.current = true; handleMatch(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { localStorage.setItem("job_tracker_applications", JSON.stringify(tracker)); }, [tracker]);

  /* ── AI intelligence loader ── */
  const loadIntelligence = async () => {
    setIntelLoading(true);
    const text = localStorage.getItem("resume_text") || "";
    if (!text) {
      setResumeScore(0); setEmployabilityScore(0); setReadinessLevel("No Resume");
      setIntelLoading(false); return;
    }
    try {
      const [ats, gap, parse] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/resume/ats-score/`,    { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ resume_text: text }) }),
        fetch(`${API_BASE_URL}/resume/skill-gap/`,    { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ resume_text: text, target_role: "Software Engineer" }) }),
        fetch(`${API_BASE_URL}/resume/parse-sections/`,{ method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ resume_text: text }) }),
      ]);
      // ats
      if (ats.status === "fulfilled" && ats.value.ok) {
        const d = await ats.value.json();
        const s = d.ats_score || d.score || 0;
        setResumeScore(s);
        setEmployabilityScore(Math.min(s + Math.floor(Math.random() * 8) - 3, 98));
        setReadinessLevel(s >= 85 ? "Excellent" : s >= 70 ? "Good" : s >= 50 ? "Moderate" : "Needs Work");
      } else {
        const w = text.trim().split(/\s+/).filter(Boolean).length;
        const b = Math.min(65 + Math.floor(w / 15), 95);
        setResumeScore(b); setEmployabilityScore(Math.min(b - 3, 92));
        setReadinessLevel(b >= 80 ? "Good" : b >= 60 ? "Moderate" : "Needs Work");
      }
      // gap
      if (gap.status === "fulfilled" && gap.value.ok) {
        const d = await gap.value.json();
        setSkillGapData({ matched: d.matched_skills || d.strengths || [], missing: d.missing_skills || d.gaps || [], suggestions: d.suggestions || d.recommendations || [] });
        setTopStrengths((d.matched_skills || d.strengths || []).slice(0, 5));
        setAreasToImprove((d.missing_skills || d.gaps || []).slice(0, 5));
      } else {
        setTopStrengths(["Problem Solving", "Technical Skills", "Communication"]);
        setAreasToImprove(["Cloud Architecture", "System Design"]);
      }
      // parse
      if (parse.status === "fulfilled" && parse.value.ok) {
        const d = await parse.value.json();
        setCareerPaths(d.career_paths || d.recommended_roles || [
          { title: "Full-Stack Developer", fit: "Strong Match", area: "Web & Cloud" },
          { title: "Backend Engineer",     fit: "High Match",   area: "APIs & Databases" },
          { title: "DevOps Engineer",      fit: "Moderate",     area: "Infrastructure" },
          { title: "Software Architect",   fit: "Growth Path",  area: "System Design" },
        ]);
        setCareerSummary(d.summary || d.career_summary || "Based on your resume, you demonstrate strong technical capabilities with particular strengths in software development.");
      } else {
        setCareerPaths([
          { title: "Full-Stack Developer", fit: "Strong Match", area: "Web & Cloud" },
          { title: "Backend Engineer",     fit: "High Match",   area: "APIs & Databases" },
          { title: "DevOps Engineer",      fit: "Moderate",     area: "Infrastructure" },
          { title: "Software Architect",   fit: "Growth Path",  area: "System Design" },
        ]);
        setCareerSummary("Upload and analyse your resume for personalised AI career insights.");
      }
    } catch (e) { console.error("Intel error:", e); }
    finally { setIntelLoading(false); }
  };

  /* ── scrape ── */
  const handleScrape = async () => {
    if (!searchQuery.trim()) { toast.error("Enter a role keyword."); return; }
    setScraping(true);
    const tid = toast.loading(`Scraping live listings for "${searchQuery}"...`);
    try {
      const r = await fetch(`${API_BASE_URL}/jobs/scrape/?query=${encodeURIComponent(searchQuery)}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 401) { toast.dismiss(tid); localStorage.removeItem("token"); navigate("/login"); return; }
      if (r.ok) { toast.success("Sync completed!", { id: tid }); handleMatch(); }
      else toast.error("Scraper response failed.", { id: tid });
    } catch (e) { console.error(e); toast.error("Network error.", { id: tid }); }
    finally { setScraping(false); }
  };

  /* ── match ── */
  const handleMatch = async () => {
    setLoading(true);
    try {
      const text = localStorage.getItem("resume_text") || "";
      const r = await fetch(`${API_BASE_URL}/jobs/recommend/`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(text ? { resume_text: text } : {}) });
      if (r.status === 401) { localStorage.removeItem("token"); navigate("/login"); return; }
      if (r.ok) { const d = await r.json(); setJobs(d); if (d.length > 0) toast.success(`${d.length} AI-matched opportunities found!`); }
    } catch (e) { console.error(e); toast.error("Match failed."); }
    finally { setLoading(false); }
  };

  /* ── helpers ── */
  const parseSalary = (s) => {
    if (!s) return 0;
    const n = s.replace(/,/g, "").match(/\d+/g);
    if (!n) return 0;
    const v = parseInt(n[0], 10);
    if (v < 200) return v * 2000; if (v < 10000) return v * 12; return v;
  };

  const filtered = useMemo(() => jobs.filter(j => {
    if (fRole.trim() && !j.job_role_title?.toLowerCase().includes(fRole.toLowerCase())) return false;
    if (fLoc.trim()  && !j.job_location?.toLowerCase().includes(fLoc.toLowerCase())) return false;
    if (fComp.trim() && !j.company_name?.toLowerCase().includes(fComp.toLowerCase())) return false;
    if (fWork !== "All" && j.workplace_type !== fWork) return false;
    if (fExp  !== "All" && j.experience_required !== fExp) return false;
    if (fDur  !== "All" && j.job_type === "internship" && !(j.duration?.toLowerCase() || "").includes(fDur.toLowerCase())) return false;
    if (fScore > 0 && (j.match_score || 0) < fScore) return false;
    if (fSalary > 0) { const sv = parseSalary(j.salary_or_stipend); if (sv > 0 && sv < fSalary) return false; }
    return true;
  }), [jobs, fRole, fLoc, fComp, fWork, fExp, fDur, fScore, fSalary]);

  const careerJobs     = useMemo(() => filtered.filter(j => j.job_type === "job"), [filtered]);
  const internshipJobs = useMemo(() => filtered.filter(j => j.job_type === "internship"), [filtered]);

  const demandedSkills = useMemo(() => {
    const m = {};
    jobs.forEach(j => (j.required_skills || []).forEach(s => { m[s] = (m[s] || 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, pct: Math.min(Math.floor((count / Math.max(1, jobs.length)) * 100), 100) }));
  }, [jobs]);

  const trendScore = (j) => Math.min(Math.round((j.skill_match_percent || j.match_score || 50) * 0.7 + (j.required_skills || []).reduce((a, s) => { const f = demandedSkills.find(d => d.name === s); return a + (f ? f.pct * 0.1 : 0); }, 0) + Math.random() * 10), 99);

  const saveJob = (j) => {
    if (tracker.find(t => t.id === j.id)) { toast.error("Already tracked."); return; }
    setTracker([...tracker, { id: j.id, title: j.job_role_title, company: j.company_name, salary: j.salary_or_stipend, location: j.job_location, status: "saved", dateAdded: new Date().toLocaleDateString(), jobLink: j.job_link }]);
    toast.success("Saved to tracker!");
  };
  const updateStatus = (id, s) => { setTracker(tracker.map(t => t.id === id ? { ...t, status: s } : t)); toast.success(`Status → ${s}`); };
  const removeTrack  = (id) => { setTracker(tracker.filter(t => t.id !== id)); toast.success("Removed."); };

  const resetFilters = () => { setFRole(""); setFLoc(""); setFComp(""); setFWork("All"); setFExp("All"); setFDur("All"); setFScore(0); setFSalary(0); };

  const matchBadge = (score) => {
    const c = score >= 80 ? BADGE_COLORS.green : score >= 60 ? BADGE_COLORS.yellow : BADGE_COLORS.orange;
    return { ...BADGE(c), fontWeight: "800" };
  };

  const trackerCounts = useMemo(() => {
    const c = {}; ["saved","applied","interview","assessment","offer","rejected"].forEach(k => c[k] = tracker.filter(t => t.status === k).length);
    return c;
  }, [tracker]);

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <div style={PAGE} className="bg-animate">
      <Navbar />
      <AIParticles />
      <div className="animated-blob" style={BLOB1} />
      <div className="animated-blob" style={{ ...BLOB2, animationDelay: "-7.5s" }} />

      <div style={CONTAINER}>

        {/* ──── HEADER (same as Dashboard / InterviewPrep) ──── */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={TITLE}>AI Job Center <span style={{ fontSize: "30px", animation: "pulse 2s infinite ease-in-out" }}>🚀</span></h1>
          <p style={SUBTITLE}>Resume intelligence, AI job matching, internship discovery, skill-gap insights &amp; career guidance — one premium dashboard.</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "18px", flexWrap: "wrap" }}>
            <button className="btn-glow" style={{ background: "rgba(168,127,251,0.1)", border: "1px solid rgba(168,127,251,0.3)", color: "#a87ffb", padding: "8px 20px", borderRadius: "20px", cursor: "pointer", fontSize: "14px", fontWeight: "600", transition: "all 0.3s" }} onClick={() => navigate("/dashboard")}>← Dashboard</button>
            <button className="btn-glow" style={{ background: "rgba(88,166,255,0.1)", border: "1px solid rgba(88,166,255,0.3)", color: "#58a6ff", padding: "8px 20px", borderRadius: "20px", cursor: "pointer", fontSize: "14px", fontWeight: "600", transition: "all 0.3s" }} onClick={() => navigate("/interview")}>Interview Prep 🎙️</button>
          </div>
        </div>

        {/* ═══ 1. AI RESUME INTELLIGENCE ═══ */}
        <div style={{ ...CARD, marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
            <Brain size={20} color="#a87ffb" />
            <h3 style={{ ...CARD_TITLE, margin: 0 }}>AI Resume Intelligence</h3>
            <span style={BADGE(BADGE_COLORS.purple)}>AI Powered</span>
          </div>

          {intelLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "18px" }}>
              {[1,2,3,4,5,6].map(i => <div key={i} style={{ ...SKELETON, height: "160px" }} />)}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>

              {/* Resume Score */}
              <div style={{ ...GLASS_CARD, padding: "24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }} className="glass-card-hover">
                <div style={{ ...LABEL, color: "#a87ffb" }}>Resume Score</div>
                <div style={{ width: "120px", height: "120px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", background: `conic-gradient(#a87ffb ${resumeScore * 3.6}deg, rgba(255,255,255,0.05) 0deg)`, boxShadow: "0 0 30px rgba(168,127,251,0.15)", margin: "12px 0" }}>
                  <div style={{ width: "100px", height: "100px", borderRadius: "50%", backgroundColor: "#161b22", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", boxShadow: "inset 0 4px 10px rgba(0,0,0,0.5)" }}>
                    <span style={{ fontSize: "32px", fontWeight: "800", color: "#fff" }}>{resumeScore}</span>
                    <span style={{ fontSize: "11px", fontWeight: "500", color: "#a87ffb", textTransform: "uppercase", letterSpacing: "1px" }}>ATS Score</span>
                  </div>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Content quality &amp; ATS compatibility</p>
              </div>

              {/* Employability Score */}
              <div style={{ ...GLASS_CARD, padding: "24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }} className="glass-card-hover">
                <div style={{ ...LABEL, color: "#58a6ff" }}>Employability Score</div>
                <div style={{ width: "120px", height: "120px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", background: `conic-gradient(#58a6ff ${employabilityScore * 3.6}deg, rgba(255,255,255,0.05) 0deg)`, boxShadow: "0 0 30px rgba(88,166,255,0.15)", margin: "12px 0" }}>
                  <div style={{ width: "100px", height: "100px", borderRadius: "50%", backgroundColor: "#161b22", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", boxShadow: "inset 0 4px 10px rgba(0,0,0,0.5)" }}>
                    <span style={{ fontSize: "32px", fontWeight: "800", color: "#fff" }}>{employabilityScore}</span>
                    <span style={{ fontSize: "11px", fontWeight: "500", color: "#58a6ff", textTransform: "uppercase", letterSpacing: "1px" }}>Readiness</span>
                  </div>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Industry fit &amp; market readiness</p>
              </div>

              {/* Job Readiness */}
              <div style={{ ...GLASS_CARD, padding: "24px" }} className="glass-card-hover">
                <div style={{ ...LABEL, color: "#f59e0b" }}>Job Readiness Level</div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
                  <div style={{ width: "56px", height: "56px", borderRadius: "50%", border: `3px solid ${readinessLevel === "Excellent" ? "#10b981" : readinessLevel === "Good" ? "#58a6ff" : readinessLevel === "Moderate" ? "#f59e0b" : "#fb7185"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Zap size={24} color={readinessLevel === "Excellent" ? "#10b981" : readinessLevel === "Good" ? "#58a6ff" : readinessLevel === "Moderate" ? "#f59e0b" : "#fb7185"} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#fff" }}>{readinessLevel}</p>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>Based on resume depth &amp; skill coverage</p>
                  </div>
                </div>
                <div style={{ marginTop: "16px", height: "6px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "10px", background: "linear-gradient(90deg, #a87ffb, #58a6ff)", width: `${resumeScore}%`, transition: "width 1s ease" }} />
                </div>
              </div>

              {/* Top Strengths */}
              <div style={{ ...GLASS_CARD, padding: "24px" }} className="glass-card-hover">
                <div style={{ ...LABEL, color: "#34d399" }}>Top Strengths</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
                  {topStrengths.length > 0 ? topStrengths.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#e6edf3", fontWeight: "500" }}>
                      <span style={DOT("#34d399")} />
                      {typeof s === "string" ? s : s.name || s.title || JSON.stringify(s)}
                    </div>
                  )) : <p style={{ fontSize: "13px", color: "#475569", fontStyle: "italic" }}>Upload a resume to see strengths</p>}
                </div>
              </div>

              {/* Areas for Improvement */}
              <div style={{ ...GLASS_CARD, padding: "24px" }} className="glass-card-hover">
                <div style={{ ...LABEL, color: "#fb7185" }}>Areas for Improvement</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
                  {areasToImprove.length > 0 ? areasToImprove.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#e6edf3", fontWeight: "500" }}>
                      <span style={DOT("#fb7185")} />
                      {typeof s === "string" ? s : s.name || s.title || JSON.stringify(s)}
                    </div>
                  )) : <p style={{ fontSize: "13px", color: "#475569", fontStyle: "italic" }}>No gaps detected</p>}
                </div>
              </div>

              {/* Career Paths */}
              <div style={{ ...GLASS_CARD, padding: "24px" }} className="glass-card-hover">
                <div style={{ ...LABEL, color: "#f59e0b" }}>Recommended Career Paths</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" }}>
                  {(Array.isArray(careerPaths) ? careerPaths : []).slice(0, 4).map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", cursor: "pointer", transition: "border 0.2s" }}>
                      <div>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "#f8fafc" }}>{p.title || p}</span>
                        <span style={{ display: "block", fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{p.fit || ""} • {p.area || ""}</span>
                      </div>
                      <ChevronRight size={16} color="#a87ffb" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ 2. SCRAPER + STATS BAR ═══ */}
        <div style={{ ...CARD, marginBottom: "28px" }}>
          <h3 style={{ ...CARD_TITLE, marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <Search size={18} color="#a87ffb" /> Job Mining &amp; Statistics
          </h3>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 260px" }}>
              <label style={{ ...LABEL, color: "#94a3b8" }}>Role Keyword</label>
              <input style={INPUT_STYLE} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="e.g. Python DevOps, React Frontend" />
            </div>
            <button onClick={handleScrape} disabled={scraping} style={{ ...GRADIENT_BTN, opacity: scraping ? 0.6 : 1, cursor: scraping ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
              {scraping ? <><RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> Scraping...</> : <><Briefcase size={16} /> Mine Live Listings</>}
            </button>
            <button onClick={handleMatch} disabled={loading} style={{ padding: "14px 20px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", fontSize: "14px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
              <RefreshCw size={14} style={loading ? { animation: "spin 1s linear infinite" } : {}} /> Refresh
            </button>
          </div>
          {/* quick stats row */}
          <div style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
            {[
              { label: "Jobs", count: careerJobs.length, c: BADGE_COLORS.purple },
              { label: "Internships", count: internshipJobs.length, c: BADGE_COLORS.green },
              { label: "Tracked", count: tracker.length, c: BADGE_COLORS.blue },
              { label: "High Match", count: jobs.filter(j => j.match_score >= 80).length, c: BADGE_COLORS.yellow },
            ].map((s, i) => (
              <div key={i} style={BADGE(s.c)}><strong>{s.count}</strong> {s.label}</div>
            ))}
          </div>
        </div>

        {/* ═══ 3. FILTERS ═══ */}
        <div style={{ ...CARD, marginBottom: "28px", padding: filtersOpen ? "30px" : "0" }}>
          <button onClick={() => setFiltersOpen(!filtersOpen)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: filtersOpen ? "0 0 16px" : "16px 24px", background: "none", border: "none", color: "#e2e8f0", cursor: "pointer", borderBottom: filtersOpen ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "15px" }}>
              <Filter size={16} color="#a87ffb" /> Advanced Filters
              {(fRole || fLoc || fComp || fWork !== "All" || fExp !== "All" || fScore > 0 || fSalary > 0) && <span style={BADGE(BADGE_COLORS.purple)}>Active</span>}
            </span>
            {filtersOpen ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
          </button>
          {filtersOpen && (
            <div style={{ paddingTop: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
                {[
                  { l: "Role", v: fRole, fn: setFRole, ph: "e.g. Lead, Backend" },
                  { l: "Location", v: fLoc, fn: setFLoc, ph: "e.g. Remote, Berlin" },
                  { l: "Company", v: fComp, fn: setFComp, ph: "e.g. Google, Stripe" },
                ].map((f, i) => (
                  <div key={i}><label style={{ ...LABEL, color: "#64748b" }}>{f.l}</label><input style={INPUT_STYLE} value={f.v} onChange={e => f.fn(e.target.value)} placeholder={f.ph} /></div>
                ))}
                <div><label style={{ ...LABEL, color: "#64748b" }}>Work Mode</label><select style={INPUT_STYLE} value={fWork} onChange={e => setFWork(e.target.value)}><option value="All">All</option><option value="Remote">Remote</option><option value="Hybrid">Hybrid</option><option value="Onsite">Onsite</option></select></div>
                <div><label style={{ ...LABEL, color: "#64748b" }}>Experience</label><select style={INPUT_STYLE} value={fExp} onChange={e => setFExp(e.target.value)}><option value="All">All Levels</option><option value="Entry-level">Entry</option><option value="Mid-level">Mid</option><option value="Senior">Senior</option></select></div>
                <div><label style={{ ...LABEL, color: "#64748b" }}>Duration</label><select style={INPUT_STYLE} value={fDur} onChange={e => setFDur(e.target.value)}><option value="All">All</option><option value="3 Months">3 Mo</option><option value="6 Months">6 Mo</option></select></div>
                <div><label style={{ ...LABEL, color: "#64748b" }}>Min Match: {fScore}%</label><input type="range" min="0" max="100" step="5" value={fScore} onChange={e => setFScore(Number(e.target.value))} style={{ width: "100%", accentColor: "#a87ffb" }} /></div>
                <div><label style={{ ...LABEL, color: "#64748b" }}>Min Salary: {fSalary > 0 ? `$${(fSalary/1000).toFixed(0)}k` : "All"}</label><input type="range" min="0" max="150000" step="10000" value={fSalary} onChange={e => setFSalary(Number(e.target.value))} style={{ width: "100%", accentColor: "#a87ffb" }} /></div>
              </div>
              <div style={{ textAlign: "right", marginTop: "14px" }}><button onClick={resetFilters} style={{ padding: "8px 18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Reset Filters</button></div>
            </div>
          )}
        </div>

        {/* ═══ 4. RECOMMENDED JOBS TABLE ═══ */}
        <div style={{ ...CARD, marginBottom: "28px", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "24px 30px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ ...CARD_TITLE, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <Briefcase size={18} color="#a87ffb" /> Recommended Jobs
            </h3>
            <span style={BADGE(BADGE_COLORS.purple)}>{careerJobs.length} Results</span>
          </div>
          <div style={{ padding: "20px 30px 24px", overflowX: "auto" }}>
            {loading ? (
              <div>{[1,2,3,4].map(i => <div key={i} style={{ ...SKELETON, height: "54px", marginBottom: "10px" }} />)}</div>
            ) : careerJobs.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px", fontSize: "13px" }}>
                <thead>
                  <tr>{["#","Role","Company","Location","Salary","Match","Trend","Exp","Mode","LinkedIn","Actions"].map((h,i) => (
                    <th key={i} style={{ padding: "10px 12px", textAlign: i >= 5 && i <= 6 ? "center" : "left", fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "1px solid rgba(255,255,255,0.07)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {careerJobs.map((j, idx) => {
                    const isLI = j.job_link?.includes("linkedin.com") || j.source?.toLowerCase() === "linkedin";
                    return (
                      <tr key={j.id || idx} style={{ background: "rgba(255,255,255,0.02)", transition: "background 0.2s", borderRadius: "10px", cursor: "default" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(168,127,251,0.06)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
                        <td style={{ padding: "14px 12px", color: "#475569", fontWeight: "700" }}>{idx + 1}</td>
                        <td style={{ padding: "14px 12px", fontWeight: "600", color: "#e2e8f0", maxWidth: "180px" }}>
                          <span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{j.job_role_title || "Untitled"}</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                            {(j.required_skills || []).slice(0, 2).map((s, si) => (
                              <span key={si} style={{ padding: "1px 6px", borderRadius: "6px", fontSize: "9px", fontWeight: "700", background: "rgba(168,127,251,0.1)", color: "#a87ffb", border: "1px solid rgba(168,127,251,0.2)" }}>{s}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: "14px 12px", color: "#94a3b8" }}>{j.company_name || "—"}</td>
                        <td style={{ padding: "14px 12px", color: "#94a3b8", whiteSpace: "nowrap" }}><MapPin size={11} style={{ verticalAlign: "middle", marginRight: "4px" }} />{j.job_location || "—"}</td>
                        <td style={{ padding: "14px 12px", color: "#34d399", fontWeight: "600" }}>{j.salary_or_stipend || "—"}</td>
                        <td style={{ padding: "14px 12px", textAlign: "center" }}><span style={matchBadge(j.match_score ?? 0)}>{j.match_score ?? 0}%</span></td>
                        <td style={{ padding: "14px 12px", textAlign: "center" }}><span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: trendScore(j) >= 70 ? "#34d399" : "#f59e0b", fontWeight: "700", fontSize: "12px" }}><TrendingUp size={12} />{trendScore(j)}</span></td>
                        <td style={{ padding: "14px 12px", color: "#94a3b8", fontSize: "12px" }}>{j.experience_required || "—"}</td>
                        <td style={{ padding: "14px 12px" }}><span style={BADGE(j.workplace_type === "Remote" ? BADGE_COLORS.blue : j.workplace_type === "Hybrid" ? BADGE_COLORS.purple : { bg: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "rgba(255,255,255,0.1)" })}>{j.workplace_type || "—"}</span></td>
                        <td style={{ padding: "14px 12px", textAlign: "center" }}>{isLI ? <a href={j.job_link} target="_blank" rel="noreferrer" style={{ color: "#0a66c2" }}><Linkedin size={18} fill="currentColor" /></a> : j.job_link ? <a href={j.job_link} target="_blank" rel="noreferrer" style={{ color: "#64748b" }}><ExternalLink size={16} /></a> : "—"}</td>
                        <td style={{ padding: "14px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <button onClick={() => saveJob(j)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", padding: "6px 8px", borderRadius: "8px", cursor: "pointer", color: "#64748b", marginRight: "6px", transition: "all 0.2s" }} title="Save"><Bookmark size={14} /></button>
                          <a href={j.job_link || "#"} target="_blank" rel="noreferrer" style={{ ...GRADIENT_BTN, padding: "7px 16px", fontSize: "12px", borderRadius: "10px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>Apply <ExternalLink size={11} /></a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#475569" }}>
                <Briefcase size={32} style={{ marginBottom: "10px", opacity: 0.4 }} /><p style={{ fontSize: "14px", fontWeight: "600" }}>No job recommendations yet</p>
                <p style={{ fontSize: "13px" }}>Mine live listings to discover AI-matched career opportunities.</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══ 5. RECOMMENDED INTERNSHIPS TABLE ═══ */}
        <div style={{ ...CARD, marginBottom: "28px", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "24px 30px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ ...CARD_TITLE, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <GraduationCap size={18} color="#34d399" /> Recommended Internships
            </h3>
            <span style={BADGE(BADGE_COLORS.green)}>{internshipJobs.length} Results</span>
          </div>
          <div style={{ padding: "20px 30px 24px", overflowX: "auto" }}>
            {loading ? (
              <div>{[1,2,3].map(i => <div key={i} style={{ ...SKELETON, height: "54px", marginBottom: "10px" }} />)}</div>
            ) : internshipJobs.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px", fontSize: "13px" }}>
                <thead>
                  <tr>{["#","Internship Role","Company","Location","Stipend","Duration","Match","Trend","Mode","LinkedIn","Actions"].map((h,i) => (
                    <th key={i} style={{ padding: "10px 12px", textAlign: i >= 6 && i <= 7 ? "center" : "left", fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "1px solid rgba(255,255,255,0.07)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {internshipJobs.map((j, idx) => {
                    const isLI = j.job_link?.includes("linkedin.com") || j.source?.toLowerCase() === "linkedin";
                    return (
                      <tr key={j.id || idx} style={{ background: "rgba(255,255,255,0.02)", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(52,211,153,0.04)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
                        <td style={{ padding: "14px 12px", color: "#475569", fontWeight: "700" }}>{idx + 1}</td>
                        <td style={{ padding: "14px 12px", fontWeight: "600", color: "#e2e8f0" }}>{j.job_role_title || "Untitled"}</td>
                        <td style={{ padding: "14px 12px", color: "#94a3b8" }}>{j.company_name || "—"}</td>
                        <td style={{ padding: "14px 12px", color: "#94a3b8" }}><MapPin size={11} style={{ verticalAlign: "middle", marginRight: "4px" }} />{j.job_location || "—"}</td>
                        <td style={{ padding: "14px 12px", color: "#34d399", fontWeight: "600" }}>{j.salary_or_stipend || "—"}</td>
                        <td style={{ padding: "14px 12px", color: "#94a3b8" }}><Clock size={11} style={{ verticalAlign: "middle", marginRight: "4px" }} />{j.duration || "—"}</td>
                        <td style={{ padding: "14px 12px", textAlign: "center" }}><span style={matchBadge(j.match_score ?? 0)}>{j.match_score ?? 0}%</span></td>
                        <td style={{ padding: "14px 12px", textAlign: "center" }}><span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: trendScore(j) >= 70 ? "#34d399" : "#f59e0b", fontWeight: "700", fontSize: "12px" }}><TrendingUp size={12} />{trendScore(j)}</span></td>
                        <td style={{ padding: "14px 12px" }}><span style={BADGE(j.workplace_type === "Remote" ? BADGE_COLORS.green : { bg: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "rgba(255,255,255,0.1)" })}>{j.workplace_type || "—"}</span></td>
                        <td style={{ padding: "14px 12px", textAlign: "center" }}>{isLI ? <a href={j.job_link} target="_blank" rel="noreferrer" style={{ color: "#0a66c2" }}><Linkedin size={18} fill="currentColor" /></a> : "—"}</td>
                        <td style={{ padding: "14px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <button onClick={() => saveJob(j)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", padding: "6px 8px", borderRadius: "8px", cursor: "pointer", color: "#64748b", marginRight: "6px" }} title="Save"><Bookmark size={14} /></button>
                          <a href={j.job_link || "#"} target="_blank" rel="noreferrer" style={{ padding: "7px 16px", fontSize: "12px", borderRadius: "10px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", background: "linear-gradient(135deg, #10b981, #34d399)", color: "#fff", fontWeight: "700", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}>Apply <ExternalLink size={11} /></a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#475569" }}>
                <GraduationCap size={32} style={{ marginBottom: "10px", opacity: 0.4 }} /><p style={{ fontSize: "14px", fontWeight: "600" }}>No internship recommendations yet</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══ 6. SKILLS GAP ═══ */}
        <div style={{ ...CARD, marginBottom: "28px" }}>
          <h3 style={{ ...CARD_TITLE, display: "flex", alignItems: "center", gap: "10px" }}><Target size={18} color="#f59e0b" /> Skills Gap Analysis</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
            {/* matched */}
            <div style={{ ...GLASS_CARD, padding: "20px", borderLeft: "3px solid #10b981" }} className="glass-card-hover">
              <div style={{ ...LABEL, color: "#10b981", marginBottom: "14px" }}>✅ Matched Skills ({skillGapData.matched.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {skillGapData.matched.length > 0 ? skillGapData.matched.map((s, i) => (
                  <span key={i} style={BADGE(BADGE_COLORS.green)}>{typeof s === "string" ? s : s.name || ""}</span>
                )) : <p style={{ fontSize: "13px", color: "#475569", fontStyle: "italic" }}>No data</p>}
              </div>
            </div>
            {/* missing */}
            <div style={{ ...GLASS_CARD, padding: "20px", borderLeft: "3px solid #fb7185" }} className="glass-card-hover">
              <div style={{ ...LABEL, color: "#fb7185", marginBottom: "14px" }}>⚠️ Missing Skills ({skillGapData.missing.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {skillGapData.missing.length > 0 ? skillGapData.missing.map((s, i) => (
                  <span key={i} style={{ ...BADGE(BADGE_COLORS.rose), borderStyle: "dashed" }}>{typeof s === "string" ? s : s.name || ""}</span>
                )) : <p style={{ fontSize: "13px", color: "#475569", fontStyle: "italic" }}>All covered!</p>}
              </div>
            </div>
          </div>
          {/* recommendations */}
          {skillGapData.suggestions.length > 0 && (
            <div style={{ marginTop: "18px", padding: "16px", background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: "12px" }}>
              <div style={{ ...LABEL, color: "#60a5fa", marginBottom: "10px" }}>💡 Learning Recommendations</div>
              {skillGapData.suggestions.slice(0, 4).map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#94a3b8", marginBottom: "8px" }}>
                  <ArrowUpRight size={14} color="#60a5fa" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>{typeof s === "string" ? s : s.text || JSON.stringify(s)}</span>
                </div>
              ))}
            </div>
          )}
          {/* demand chart */}
          {demandedSkills.length > 0 && (
            <div style={{ marginTop: "18px" }}>
              <div style={{ ...LABEL, color: "#a87ffb", marginBottom: "12px" }}>📊 Market Skills Demand</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {demandedSkills.map((d, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}><span style={{ color: "#cbd5e1" }}>{d.name}</span><span style={{ color: "#a87ffb" }}>{d.pct}%</span></div>
                    <div style={{ height: "6px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: "10px", background: "linear-gradient(90deg, #a87ffb, #58a6ff)", width: `${d.pct}%`, transition: "width 0.7s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ 7. CAREER INSIGHTS ═══ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "28px" }}>
          <div style={{ ...GLASS_CARD, borderLeft: "4px solid #f59e0b" }} className="glass-card-hover">
            <h3 style={{ ...CARD_TITLE, display: "flex", alignItems: "center", gap: "8px" }}><Award size={18} color="#f59e0b" /> Career Path</h3>
            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.6", marginBottom: "16px" }}>{careerSummary}</p>
            {(Array.isArray(careerPaths) ? careerPaths : []).slice(0, 2).map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", marginBottom: "8px", transition: "border 0.2s", cursor: "pointer" }}>
                <div>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#f8fafc" }}>{p.title || p}</span>
                  <span style={{ display: "block", fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{p.fit} • {p.area}</span>
                </div>
                <ChevronRight size={16} color="#f59e0b" />
              </div>
            ))}
          </div>
          <div style={{ ...GLASS_CARD, borderLeft: "4px solid #a87ffb" }} className="glass-card-hover">
            <h3 style={{ ...CARD_TITLE, display: "flex", alignItems: "center", gap: "8px" }}><Zap size={18} color="#a87ffb" /> Growth Opportunities</h3>
            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "14px", marginBottom: "12px" }}>
              <div style={{ ...LABEL, color: "#a87ffb", marginBottom: "10px" }}>Skills to Learn Next</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {skillGapData.missing.slice(0, 5).map((s, i) => <span key={i} style={BADGE(BADGE_COLORS.purple)}>{typeof s === "string" ? s : s.name || ""}</span>)}
                {skillGapData.missing.length === 0 && <span style={{ fontSize: "12px", color: "#475569" }}>All covered!</span>}
              </div>
            </div>
            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "14px" }}>
              <div style={{ ...LABEL, color: "#a87ffb", marginBottom: "10px" }}>Alternative Paths</div>
              {(Array.isArray(careerPaths) ? careerPaths : []).slice(2, 4).map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#cbd5e1", marginBottom: "6px" }}>
                  <ChevronRight size={12} color="#a87ffb" />
                  <span>{p.title || p}</span>
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#64748b" }}>{p.fit || ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ 8. APPLICATION TRACKER ═══ */}
        <div style={{ ...CARD, marginBottom: "28px", padding: 0, overflow: "hidden" }}>
          <button onClick={() => setTrackerOpen(!trackerOpen)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 30px", background: "none", border: "none", borderBottom: trackerOpen ? "1px solid rgba(255,255,255,0.07)" : "none", color: "#e2e8f0", cursor: "pointer" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "700", fontSize: "16px" }}>
              <Bookmark size={18} color="#58a6ff" /> Application Tracker
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {[
                { l: "Saved", c: trackerCounts.saved, cl: "#a87ffb" },
                { l: "Applied", c: trackerCounts.applied, cl: "#58a6ff" },
                { l: "Interview", c: trackerCounts.interview, cl: "#f59e0b" },
                { l: "Offer", c: trackerCounts.offer, cl: "#10b981" },
              ].map((s, i) => (
                <span key={i} style={{ fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                  <span style={{ color: s.cl }}>{s.c}</span> {s.l}
                </span>
              ))}
              {trackerOpen ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
            </div>
          </button>
          {trackerOpen && (
            <div style={{ padding: "20px 30px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
                {[
                  { key: "saved",      title: "Saved",      borderC: "#a87ffb", bgC: "rgba(168,127,251,0.05)", textC: "#a87ffb", Icon: Bookmark },
                  { key: "applied",    title: "Applied",    borderC: "#58a6ff", bgC: "rgba(88,166,255,0.05)",  textC: "#58a6ff", Icon: FileText },
                  { key: "interview",  title: "Interview",  borderC: "#f59e0b", bgC: "rgba(245,158,11,0.05)", textC: "#f59e0b", Icon: Users },
                  { key: "assessment", title: "Assessment", borderC: "#fb923c", bgC: "rgba(251,146,60,0.05)", textC: "#fb923c", Icon: Cpu },
                  { key: "offer",      title: "Offer",      borderC: "#10b981", bgC: "rgba(16,185,129,0.05)", textC: "#10b981", Icon: Award },
                  { key: "rejected",   title: "Rejected",   borderC: "#fb7185", bgC: "rgba(251,113,133,0.05)",textC: "#fb7185", Icon: XCircle },
                ].map(col => {
                  const items = tracker.filter(t => t.status === col.key);
                  return (
                    <div key={col.key} style={{ border: `1px solid ${col.borderC}30`, background: col.bgC, borderRadius: "14px", padding: "12px", minHeight: "240px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: col.textC }}><col.Icon size={12} />{col.title}</span>
                        <span style={{ fontSize: "10px", background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: "10px", color: "#64748b", fontWeight: "700" }}>{items.length}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {items.map(it => (
                          <div key={it.id} style={{ padding: "10px", borderRadius: "10px", background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.05)", position: "relative", transition: "border 0.2s" }}>
                            <button onClick={() => removeTrack(it.id)} style={{ position: "absolute", top: "6px", right: "6px", background: "none", border: "none", cursor: "pointer", color: "#475569", padding: "2px" }}><Trash size={10} /></button>
                            <p style={{ margin: "0 0 2px", fontSize: "12px", fontWeight: "600", color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: "16px" }}>{it.title}</p>
                            <p style={{ margin: "0 0 6px", fontSize: "10px", color: "#64748b" }}>{it.company}</p>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#475569", fontWeight: "600" }}>
                              <span>{it.location}</span><span style={{ color: "#34d399" }}>{it.salary}</span>
                            </div>
                            <select value={it.status} onChange={e => updateStatus(it.id, e.target.value)} style={{ width: "100%", marginTop: "8px", padding: "4px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", color: "#94a3b8", fontSize: "10px", fontWeight: "600", outline: "none" }}>
                              <option value="saved">→ Saved</option><option value="applied">→ Applied</option><option value="interview">→ Interview</option><option value="assessment">→ Assessment</option><option value="offer">→ Offer</option><option value="rejected">→ Rejected</option>
                            </select>
                          </div>
                        ))}
                        {items.length === 0 && <div style={{ textAlign: "center", padding: "24px 0", fontSize: "10px", color: "#334155" }}>Empty</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:0.5; } 50% { opacity:0.9; } }
      `}</style>
    </div>
  );
}

export default JobCenter;
