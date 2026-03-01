import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AIParticles from "../components/AIParticles";
import Navbar from "../components/Navbar";

function Results() {
    const location = useLocation();
    const navigate = useNavigate();
    const data = location.state?.data;

    const [animatedScore, setAnimatedScore] = useState(0);
    const [animatedBreakdown, setAnimatedBreakdown] = useState({
        skills: 0, experience: 0, keywords: 0, formatting: 0, grammar: 0
    });
    const [filterMode, setFilterMode] = useState("All");

    useEffect(() => {
        if (!data) {
            navigate("/dashboard");
            return;
        }

        const targetScore = data.ats_score || 0;
        const targetBreakdown = data.score_breakdown || {
            skills: 50, experience: 50, keywords: 50, formatting: 50, grammar: 50
        };
        if (targetScore === 0) return;

        let start = 0;
        const interval = setInterval(() => {
            start += 1;
            setAnimatedScore(start);

            // Proportional animation for breakdown scores
            setAnimatedBreakdown(prev => ({
                skills: Math.min(Math.round((start / targetScore) * targetBreakdown.skills), targetBreakdown.skills),
                experience: Math.min(Math.round((start / targetScore) * targetBreakdown.experience), targetBreakdown.experience),
                keywords: Math.min(Math.round((start / targetScore) * targetBreakdown.keywords), targetBreakdown.keywords),
                formatting: Math.min(Math.round((start / targetScore) * targetBreakdown.formatting), targetBreakdown.formatting),
                grammar: Math.min(Math.round((start / targetScore) * targetBreakdown.grammar), targetBreakdown.grammar),
            }));

            if (start >= targetScore) clearInterval(interval);
        }, 15);

        return () => clearInterval(interval);
    }, [data, navigate]);

    if (!data) return null;

    const token = localStorage.getItem("token");

    const handleDownload = () => {
        fetch(`http://127.0.0.1:8000/download-report/${data.report_filename}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.blob())
            .then((blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = data.report_filename;
                a.click();
            });
    };

    const circleDegree = animatedScore * 3.6;

    return (
        <div style={styles.page} className="bg-animate">
            <Navbar />
            <AIParticles />
            {/* Decorative Blob */}
            <div className="animated-blob" style={styles.blob1}></div>
            <div className="animated-blob" style={{ ...styles.blob2, animationDelay: '-7.5s' }}></div>

            <div style={styles.container}>
                <button style={styles.backBtn} className="btn-glow" onClick={() => navigate("/dashboard")}>
                    ← Back to Dashboard
                </button>

                <div style={styles.header}>
                    <h1 style={styles.title}>Analysis Results <span style={styles.badgeSparkle}>✨</span></h1>
                    <p style={styles.subtitle}>Your personalized career blueprint</p>
                </div>

                <div style={styles.resultsWrapper}>
                    {/* Top Row: Score and Suggestions */}
                    <div style={styles.topRow}>
                        {/* ATS Score and Breakdown */}
                        <div style={styles.scoreGlassCard} className="glass-card-hover">
                            <h3 style={styles.cardSectionTitle}>Resume Strength</h3>
                            <div style={{
                                ...styles.circle,
                                background: `conic-gradient(#a87ffb ${circleDegree}deg, rgba(255,255,255,0.05) 0deg)`
                            }}>
                                <div style={styles.innerCircle}>
                                    {animatedScore}<span style={styles.percentSign}>%</span>
                                    <span style={styles.scoreLabel}>ATS Score</span>
                                </div>
                            </div>

                            {/* Detailed Score Breakdowns */}
                            <div style={styles.breakdownContainer}>
                                {[
                                    { key: "skills", label: "Skills Match", color: "#58a6ff" },
                                    { key: "experience", label: "Experience Level", color: "#10b981" },
                                    { key: "keywords", label: "Keyword Density", color: "#f59e0b" },
                                    { key: "formatting", label: "Formatting Quality", color: "#8b5cf6" },
                                    { key: "grammar", label: "Grammar & Syntax", color: "#ec4899" }
                                ].map((item) => (
                                    <div key={item.key} style={styles.progressRow}>
                                        <div style={styles.progressLabelRow}>
                                            <span style={styles.progressLabel}>{item.label}</span>
                                            <span style={{ ...styles.progressPercent, color: item.color }}>{animatedBreakdown[item.key] || 0}%</span>
                                        </div>
                                        <div style={styles.progressBarBg}>
                                            <div style={{
                                                ...styles.progressBarFill,
                                                width: `${animatedBreakdown[item.key] || 0}%`,
                                                backgroundColor: item.color,
                                                boxShadow: `0 0 10px ${item.color}80`
                                            }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommended Roles */}
                        <div style={styles.rolesGlassCard} className="glass-card-hover">
                            <div style={styles.rolesHeader}>
                                <h3 style={styles.cardSectionTitle}>Top Matching Roles</h3>
                                <div style={styles.filtersWrapper}>
                                    {["All", "Remote", "Mid-level"].map(f => (
                                        <span
                                            key={f}
                                            style={filterMode === f ? styles.filterBtnActive : styles.filterBtn}
                                            className="btn-glow"
                                            onClick={() => setFilterMode(f)}
                                        >
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div style={styles.jobContainer}>
                                {(data.job_recommendations || [])
                                    .filter(job => {
                                        if (filterMode === "All") return true;
                                        if (filterMode === "Remote" && job.location?.toLowerCase().includes("remote")) return true;
                                        if (filterMode === "Mid-level" && job.experience_level?.toLowerCase().includes("mid")) return true;
                                        return false;
                                    })
                                    .map((job, idx) => (
                                        <div key={idx} style={{ ...styles.jobCard, animationDelay: `${idx * 0.1}s` }}>
                                            <div style={styles.jobCardHeader}>
                                                <div>
                                                    <h4 style={styles.jobTitle}>{job.title || "Unknown Role"}</h4>
                                                    <p style={styles.jobCompany}>{job.company || "Unknown Company"} • {job.location || "N/A"}</p>
                                                </div>
                                                <div style={styles.jobMatchBadge}>{job.match_percentage || 0}% Match</div>
                                            </div>
                                            <p style={styles.jobDesc}>{job.description}</p>

                                            <div style={styles.jobCardFooter}>
                                                <span style={styles.jobTagMini}>{job.experience_level || "Any"}</span>
                                                <div style={styles.jobActions}>
                                                    <button style={styles.viewBtn} className="btn-glow">View Details</button>
                                                    <button style={styles.applyBtn} className="btn-glow">Apply Now</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                {(data.job_recommendations || []).length > 0 && (data.job_recommendations || []).filter(job => {
                                    if (filterMode === "All") return true;
                                    if (filterMode === "Remote" && job.location?.toLowerCase().includes("remote")) return true;
                                    if (filterMode === "Mid-level" && job.experience_level?.toLowerCase().includes("mid")) return true;
                                    return false;
                                }).length === 0 && (
                                        <p style={{ color: "#94a3b8", textAlign: "center", fontStyle: "italic" }}>No jobs match this filter.</p>
                                    )}
                            </div>
                        </div>
                    </div>

                    {/* Middle Row: Strengths and Weaknesses */}
                    <div style={{ ...styles.topRow, gridTemplateColumns: "1fr 1fr" }}>
                        {/* Strengths */}
                        <div style={styles.rolesGlassCard} className="glass-card-hover">
                            <h3 style={styles.cardSectionTitle}>Identified Strengths</h3>
                            <div style={styles.jobContainer}>
                                {(data.strengths || []).map((str, idx) => (
                                    <div key={idx} style={{ ...styles.jobTag, background: "rgba(88, 166, 255, 0.1)", border: "1px solid rgba(88, 166, 255, 0.3)", animationDelay: `${idx * 0.1}s` }}>
                                        <span style={{ ...styles.jobDot, backgroundColor: "#58a6ff", boxShadow: "0 0 10px #58a6ff" }}></span> {str}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Weaknesses */}
                        <div style={styles.rolesGlassCard} className="glass-card-hover">
                            <h3 style={styles.cardSectionTitle}>Areas for Improvement</h3>
                            <div style={styles.jobContainer}>
                                {(data.weaknesses || []).map((wk, idx) => (
                                    <div key={idx} style={{ ...styles.jobTag, background: "rgba(255, 123, 173, 0.1)", border: "1px solid rgba(255, 123, 173, 0.3)", animationDelay: `${idx * 0.1}s` }}>
                                        <span style={{ ...styles.jobDot, backgroundColor: "#ff7bad", boxShadow: "0 0 10px #ff7bad" }}></span> {wk}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Deep Analysis & Optimization */}
                    <div style={{ ...styles.topRow, gridTemplateColumns: "1fr 1fr 1fr" }}>
                        <div style={styles.rolesGlassCard} className="glass-card-hover">
                            <h3 style={styles.cardSectionTitle}>Formatting <span style={styles.neonIcon}>🖋️</span></h3>
                            <div style={styles.jobContainer}>
                                {(data.formatting_suggestions || []).map((str, idx) => (
                                    <div key={idx} style={{ ...styles.jobTag, background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", animationDelay: `${idx * 0.1}s` }}>
                                        <span style={{ ...styles.jobDot, backgroundColor: "#3b82f6", boxShadow: "0 0 10px #3b82f6" }}></span> {str}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={styles.rolesGlassCard} className="glass-card-hover">
                            <h3 style={styles.cardSectionTitle}>Keywords <span style={styles.neonIcon}>🔑</span></h3>
                            <div style={styles.jobContainer}>
                                {(data.keyword_optimization || []).map((wk, idx) => (
                                    <div key={idx} style={{ ...styles.jobTag, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", animationDelay: `${idx * 0.1}s` }}>
                                        <span style={{ ...styles.jobDot, backgroundColor: "#10b981", boxShadow: "0 0 10px #10b981" }}></span> {wk}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={styles.rolesGlassCard} className="glass-card-hover">
                            <h3 style={styles.cardSectionTitle}>Industry <span style={styles.neonIcon}>🏢</span></h3>
                            <div style={styles.jobContainer}>
                                {(data.industry_suggestions || []).map((wk, idx) => (
                                    <div key={idx} style={{ ...styles.jobTag, background: "rgba(14, 165, 233, 0.1)", border: "1px solid rgba(14, 165, 233, 0.3)", animationDelay: `${idx * 0.1}s` }}>
                                        <span style={{ ...styles.jobDot, backgroundColor: "#0ea5e9", boxShadow: "0 0 10px #0ea5e9" }}></span> {wk}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Resume Summary */}
                    <div style={styles.summaryGlassCard} className="glass-card-hover">
                        <div style={styles.summaryHeader}>
                            <h3 style={styles.cardSectionTitle}>Executive AI Summary</h3>
                            <span style={styles.aiBadge}>AI Generated</span>
                        </div>

                        {data.profile_overview && (
                            <div style={styles.overviewSection}>
                                <p style={styles.summaryText}>
                                    <strong>Overall Strength:</strong> {data.profile_overview.strength}<br />
                                    <strong>Experience Level:</strong> {data.profile_overview.experience_level}<br />
                                    <strong>Key Domain:</strong> {data.profile_overview.domain}
                                </p>
                            </div>
                        )}

                        <div style={styles.longSummaryContainer}>
                            {data.summary.split('. ').map((sentence, idx) => {
                                if (!sentence) return null;
                                return <p key={idx} style={{ ...styles.summaryText, marginBottom: "12px" }}>{sentence.trim() + "."}</p>
                            })}
                        </div>

                        {data.detailed_summary && (
                            <div style={styles.detailedSummaryGrid}>
                                {Object.entries({
                                    key_strengths: "Key Strengths",
                                    missing_skills: "Missing Skills",
                                    improvement_suggestions: "Improvement Suggestions",
                                    ats_optimization: "ATS Optimization Tips",
                                    job_suitability: "Job Role Suitability"
                                }).map(([key, label]) => (
                                    <div key={key} style={styles.summaryDetailBlock}>
                                        <h4 style={styles.detailLabel}>{label}</h4>
                                        <ul style={styles.detailList}>
                                            {(data.detailed_summary[key] || []).map((item, i) => (
                                                <li key={i} style={styles.detailItem}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Download & History */}
                    <div style={styles.downloadContainer}>
                        <button style={styles.downloadBtn} className="btn-glow" onClick={handleDownload}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download Report
                        </button>
                        <button style={styles.historyBtn} className="btn-glow" onClick={() => navigate("/upload-history", { state: { data: data } })}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            View Upload History
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        backgroundImage: "radial-gradient(circle at top, #1e293b, #0f172a 80%)",
        fontFamily: "'Inter', sans-serif",
        padding: "80px 20px",
        position: "relative",
        overflow: "hidden",
        color: "#f8fafc",
    },
    blob1: {
        position: "absolute",
        top: "-150px",
        left: "-150px",
        width: "400px",
        height: "400px",
        background: "rgba(168, 127, 251, 0.15)",
        filter: "blur(80px)",
        borderRadius: "50%",
        zIndex: 0,
    },
    blob2: {
        position: "absolute",
        bottom: "-200px",
        right: "-100px",
        width: "500px",
        height: "500px",
        background: "rgba(88, 166, 255, 0.1)",
        filter: "blur(100px)",
        borderRadius: "50%",
        zIndex: 0,
    },
    container: {
        width: "100%",
        maxWidth: "1000px",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
    },
    backBtn: {
        background: "transparent",
        border: "none",
        color: "#94a3b8",
        fontSize: "15px",
        cursor: "pointer",
        marginBottom: "20px",
        transition: "color 0.2s ease",
    },
    header: {
        textAlign: "center",
        marginBottom: "50px",
    },
    title: {
        fontSize: "42px",
        fontWeight: "800",
        color: "#ffffff",
        letterSpacing: "-1px",
        margin: "0 0 10px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
    },
    badgeSparkle: {
        fontSize: "30px",
        animation: "pulse 2s infinite ease-in-out",
    },
    subtitle: {
        fontSize: "18px",
        color: "#8b949e",
        fontWeight: "400",
    },
    resultsWrapper: {
        display: "flex",
        flexDirection: "column",
        gap: "25px",
        animation: "fadeInUp 0.6s ease-out forwards",
    },
    topRow: {
        display: "grid",
        gridTemplateColumns: "1fr 1.5fr",
        gap: "25px",
    },
    scoreGlassCard: {
        background: "rgba(30, 41, 59, 0.4)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "30px",
        borderRadius: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    },
    cardSectionTitle: {
        margin: "0 0 20px 0",
        fontSize: "18px",
        fontWeight: "600",
        color: "#ffffff",
        alignSelf: "flex-start",
        width: "100%",
    },
    circle: {
        width: "160px",
        height: "160px",
        borderRadius: "50%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        boxShadow: "0 0 30px rgba(168, 127, 251, 0.15)",
        marginTop: "10px",
    },
    innerCircle: {
        width: "140px",
        height: "140px",
        borderRadius: "50%",
        backgroundColor: "#161b22",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "42px",
        fontWeight: "800",
        color: "#ffffff",
        boxShadow: "inset 0 4px 10px rgba(0,0,0,0.5)",
    },
    percentSign: {
        fontSize: "20px",
        color: "#8b949e",
        marginLeft: "2px",
    },
    scoreLabel: {
        fontSize: "13px",
        fontWeight: "500",
        color: "#a87ffb",
        letterSpacing: "1px",
        textTransform: "uppercase",
        marginTop: "4px",
    },
    breakdownContainer: {
        width: "100%",
        marginTop: "30px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    progressRow: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    progressLabelRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
    },
    progressLabel: {
        fontSize: "13px",
        fontWeight: "600",
        color: "#cbd5e1",
        letterSpacing: "0.5px",
    },
    progressPercent: {
        fontSize: "13px",
        fontWeight: "800",
    },
    progressBarBg: {
        width: "100%",
        height: "8px",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: "10px",
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        borderRadius: "10px",
        transition: "width 0.1s linear",
    },
    rolesGlassCard: {
        background: "rgba(30, 41, 59, 0.4)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "30px",
        borderRadius: "24px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    },
    rolesHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
    },
    filtersWrapper: {
        display: "flex",
        gap: "10px",
    },
    filterBtn: {
        padding: "6px 14px",
        borderRadius: "20px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#94a3b8",
        fontSize: "13px",
        cursor: "pointer",
        transition: "all 0.2s ease"
    },
    filterBtnActive: {
        padding: "6px 14px",
        borderRadius: "20px",
        background: "rgba(59, 130, 246, 0.2)",
        border: "1px solid #3b82f6",
        color: "#60a5fa",
        fontSize: "13px",
        cursor: "pointer",
        transition: "all 0.2s ease"
    },
    jobContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginTop: "10px",
    },
    jobCard: {
        background: "rgba(15, 23, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "20px",
        padding: "20px",
        transition: "transform 0.2s ease, border 0.2s ease",
    },
    jobCardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "10px",
    },
    jobTitle: {
        margin: 0,
        fontSize: "18px",
        color: "#f8fafc",
        fontWeight: "600",
    },
    jobCompany: {
        margin: "4px 0 0 0",
        color: "#94a3b8",
        fontSize: "14px",
    },
    jobMatchBadge: {
        background: "rgba(16, 185, 129, 0.15)",
        color: "#10b981",
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: "600",
        border: "1px solid rgba(16, 185, 129, 0.3)",
    },
    jobDesc: {
        fontSize: "14px",
        color: "#cbd5e1",
        lineHeight: "1.5",
        marginBottom: "15px",
    },
    jobCardFooter: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    jobTagMini: {
        background: "rgba(255,255,255,0.05)",
        padding: "4px 10px",
        borderRadius: "8px",
        fontSize: "12px",
        color: "#94a3b8",
    },
    jobActions: {
        display: "flex",
        gap: "10px",
    },
    viewBtn: {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#e2e8f0",
        padding: "8px 16px",
        borderRadius: "12px",
        cursor: "pointer",
        fontSize: "13px",
        transition: "background 0.2s ease",
    },
    applyBtn: {
        background: "#3b82f6",
        border: "none",
        color: "#fff",
        padding: "8px 16px",
        borderRadius: "12px",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: "600",
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
    },
    jobTag: {
        background: "rgba(168, 127, 251, 0.1)",
        border: "1px solid rgba(168, 127, 251, 0.3)",
        padding: "16px 20px",
        borderRadius: "12px",
        fontSize: "16px",
        fontWeight: "500",
        color: "#e6edf3",
        display: "flex",
        alignItems: "center",
        transition: "transform 0.2s ease, background 0.2s ease",
        cursor: "default",
    },
    jobDot: {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        backgroundColor: "#a87ffb",
        marginRight: "15px",
        boxShadow: "0 0 10px #a87ffb",
    },
    summaryGlassCard: {
        background: "rgba(30, 41, 59, 0.4)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderLeft: "4px solid #3b82f6",
        padding: "35px",
        borderRadius: "24px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    },
    summaryHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
    },
    aiBadge: {
        background: "rgba(88, 166, 255, 0.15)",
        border: "1px solid rgba(88, 166, 255, 0.4)",
        color: "#58a6ff",
        fontSize: "12px",
        padding: "6px 12px",
        borderRadius: "30px",
        fontWeight: "600",
        letterSpacing: "0.5px",
    },
    longSummaryContainer: {
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(30, 41, 59, 0.6) 100%)",
        padding: "25px",
        borderRadius: "16px",
        borderLeft: "4px solid #a87ffb",
        marginBottom: "25px",
    },
    summaryText: {
        fontSize: "16px",
        lineHeight: "1.8",
        color: "#c9d1d9",
        margin: 0,
        whiteSpace: "pre-wrap",
    },
    downloadContainer: {
        textAlign: "center",
        marginTop: "20px",
        marginBottom: "40px",
        display: "flex",
        justifyContent: "center",
        gap: "20px",
    },
    downloadBtn: {
        padding: "16px 30px",
        borderRadius: "30px",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(22, 27, 34, 0.8)",
        color: "#ffffff",
        fontWeight: "600",
        fontSize: "15px",
        cursor: "pointer",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        transition: "all 0.3s ease",
        display: "inline-flex",
        alignItems: "center",
    },
    historyBtn: {
        padding: "16px 30px",
        borderRadius: "30px",
        border: "1px solid rgba(168, 127, 251, 0.3)",
        background: "linear-gradient(135deg, rgba(168, 127, 251, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)",
        color: "#ffffff",
        fontWeight: "600",
        fontSize: "15px",
        cursor: "pointer",
        boxShadow: "0 8px 24px rgba(168, 127, 251, 0.2)",
        transition: "all 0.3s ease",
        display: "inline-flex",
        alignItems: "center",
        backdropFilter: "blur(10px)",
    },
    overviewSection: {
        marginBottom: "20px",
        padding: "15px",
        background: "rgba(255, 255, 255, 0.03)",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.05)",
    },
    detailedSummaryGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px",
        marginTop: "25px",
    },
    summaryDetailBlock: {
        background: "rgba(0, 0, 0, 0.2)",
        padding: "20px",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.05)",
    },
    detailLabel: {
        margin: "0 0 12px 0",
        fontSize: "15px",
        fontWeight: "700",
        color: "#a87ffb",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    detailList: {
        margin: 0,
        paddingLeft: "20px",
        color: "#cbd5e1",
        fontSize: "14px",
    },
    detailItem: {
        marginBottom: "8px",
        lineHeight: "1.4",
    },
    neonIcon: {
        fontSize: "18px",
        marginLeft: "5px",
    }
};

export default Results;
