import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import AIParticles from "../components/AIParticles";
import { API_BASE_URL } from "../config/api";

const CATEGORY_COLORS = {
    Technical:  { bg: "rgba(88,166,255,0.12)", color: "#58a6ff", border: "rgba(88,166,255,0.25)" },
    Behavioral: { bg: "rgba(168,127,251,0.12)", color: "#a87ffb", border: "rgba(168,127,251,0.25)" },
    HR:         { bg: "rgba(52,211,153,0.12)",  color: "#34d399", border: "rgba(52,211,153,0.25)" },
};

const DIFFICULTY_COLORS = {
    easy:   { bg: "rgba(16,185,129,0.15)",  color: "#10b981", border: "rgba(16,185,129,0.3)" },
    medium: { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
    hard:   { bg: "rgba(239,68,68,0.15)",   color: "#f87171", border: "rgba(239,68,68,0.3)" },
};

const TAB_LABELS = ["All", "Technical", "Behavioral", "HR"];

function InterviewPrep() {
    const [resumeText, setResumeText]     = useState(localStorage.getItem("resume_text") || "");
    const [targetRole, setTargetRole]     = useState("Software Engineer");
    const [questions, setQuestions]       = useState([]);
    const [isLoading, setIsLoading]       = useState(false);
    const [expandedIdx, setExpandedIdx]   = useState({});
    const [activeTab, setActiveTab]       = useState("All");
    const [error, setError]               = useState("");

    const toggleAnswer = (idx) =>
        setExpandedIdx((prev) => ({ ...prev, [idx]: !prev[idx] }));

    const handleGenerate = async () => {
        if (!targetRole.trim()) {
            setError("Please enter a target role.");
            return;
        }
        const token = localStorage.getItem("token");
        if (!token) { window.location.href = "/login"; return; }
        localStorage.setItem("resume_text", resumeText);
        setError("");
        setIsLoading(true);
        setQuestions([]);
        setExpandedIdx({});
        setActiveTab("All");
        try {
            const res = await fetch(`${API_BASE_URL}/interview/generate/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ resume_text: resumeText, target_role: targetRole }),
            });
            if (res.status === 401) {
                localStorage.removeItem("token");
                window.location.href = "/login";
                return;
            }
            const data = await res.json();
            if (res.ok && data.questions) {
                setQuestions(data.questions);
            } else {
                setError(data.detail || "Failed to generate questions. Please try again.");
            }
        } catch {
            setError("Network error. Please check your connection.");
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = useMemo(() =>
        activeTab === "All" ? questions : questions.filter(q => q.category === activeTab),
        [questions, activeTab]
    );

    const counts = useMemo(() => ({
        Technical: questions.filter(q => q.category === "Technical").length,
        Behavioral: questions.filter(q => q.category === "Behavioral").length,
        HR: questions.filter(q => q.category === "HR").length,
    }), [questions]);

    const handleExport = () => {
        const lines = filtered.map((q, i) =>
            `Q${i + 1} [${q.category} | ${q.difficulty}]\n${q.question}\n\nSample Answer:\n${q.answer}\n\nWhy this is asked:\n${q.explanation}\n${"-".repeat(60)}`
        ).join("\n\n");
        const blob = new Blob([`Interview Prep: ${targetRole}\n${"=".repeat(60)}\n\n${lines}`], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `interview_${targetRole.replace(/\s+/g, "_")}.txt`;
        a.click();
    };

    return (
        <div style={S.page} className="bg-animate">
            <Navbar />
            <AIParticles />

            <div style={S.container}>
                {/* Header */}
                <div style={S.header}>
                    <h1 style={S.title}>AI Interview Prep <span>🎙️</span></h1>
                    <p style={S.subtitle}>Generate 20 personalised questions — Technical, Behavioral & HR — tailored to your resume</p>
                </div>

                {/* Setup Card */}
                <div style={S.card}>
                    <h3 style={S.cardTitle}>Interview Setup</h3>
                    <div style={S.row}>
                        <input
                            id="target-role-input"
                            style={S.input}
                            placeholder="Target role (e.g. Frontend Developer, Data Scientist)"
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                        />
                    </div>
                    <textarea
                        id="resume-text-input"
                        style={S.textarea}
                        placeholder="Paste your resume text here for personalised questions (optional)..."
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                    />
                    {error && <div style={S.errorBox}>⚠️ {error}</div>}
                    <button
                        id="generate-questions-btn"
                        style={isLoading ? { ...S.generateBtn, opacity: 0.6, cursor: "not-allowed" } : S.generateBtn}
                        onClick={handleGenerate}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span style={S.loadingInner}>
                                <span style={S.spinner} /> Generating 20 Questions...
                            </span>
                        ) : "✨ Generate Interview Questions"}
                    </button>
                </div>

                {/* Results */}
                {questions.length > 0 && (
                    <div style={{ ...S.card, marginTop: "28px" }}>
                        {/* Stats Row */}
                        <div style={S.statsRow}>
                            {Object.entries(counts).map(([cat, n]) => {
                                const c = CATEGORY_COLORS[cat];
                                return (
                                    <div key={cat} style={{ ...S.statChip, background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
                                        <strong>{n}</strong> {cat}
                                    </div>
                                );
                            })}
                            <div style={S.totalChip}>Total: {questions.length}</div>
                            <button id="export-questions-btn" style={S.exportBtn} onClick={handleExport}>⬇ Export</button>
                        </div>

                        {/* Tab Bar */}
                        <div style={S.tabBar}>
                            {TAB_LABELS.map(tab => (
                                <button
                                    key={tab}
                                    id={`tab-${tab.toLowerCase()}`}
                                    style={{ ...S.tab, ...(activeTab === tab ? S.tabActive : {}) }}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab}
                                    <span style={{ ...S.tabCount, ...(activeTab === tab ? S.tabCountActive : {}) }}>
                                        {tab === "All" ? questions.length : counts[tab]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Question Grid */}
                        <div style={S.grid}>
                            {filtered.map((q, idx) => {
                                const catStyle  = CATEGORY_COLORS[q.category] || CATEGORY_COLORS.Technical;
                                const diffStyle = DIFFICULTY_COLORS[(q.difficulty || "medium").toLowerCase()] || DIFFICULTY_COLORS.medium;
                                const isOpen    = expandedIdx[idx];
                                return (
                                    <div
                                        key={idx}
                                        id={`question-card-${idx}`}
                                        style={{ ...S.qCard, borderTop: `3px solid ${catStyle.color}` }}
                                    >
                                        <div style={S.qBadgeRow}>
                                            <span style={{ ...S.badge, background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}>
                                                {q.category}
                                            </span>
                                            <span style={{ ...S.badge, background: diffStyle.bg, color: diffStyle.color, border: `1px solid ${diffStyle.border}` }}>
                                                {(q.difficulty || "medium").toUpperCase()}
                                            </span>
                                            <span style={S.qNumber}>#{idx + 1}</span>
                                        </div>

                                        <p style={S.qText}>{q.question}</p>

                                        {(q.answer || q.explanation) && (
                                            <button
                                                id={`toggle-answer-${idx}`}
                                                style={S.toggleBtn}
                                                onClick={() => toggleAnswer(idx)}
                                            >
                                                {isOpen ? "▲ Hide Details" : "▼ Show Answer & Tips"}
                                            </button>
                                        )}

                                        {isOpen && (
                                            <div style={S.expandSection}>
                                                {q.explanation && (
                                                    <div style={S.explanationBox}>
                                                        <div style={S.boxLabel}>💡 Why Interviewers Ask This</div>
                                                        <p style={S.boxText}>{q.explanation}</p>
                                                    </div>
                                                )}
                                                {q.answer && (
                                                    <div style={S.answerBox}>
                                                        <div style={S.boxLabelGreen}>✅ Strong Sample Answer</div>
                                                        <p style={S.boxText}>{q.answer}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Loading Skeleton */}
                {isLoading && (
                    <div style={{ ...S.card, marginTop: "28px" }}>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} style={S.skeleton} />
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100% { opacity:0.5 } 50% { opacity:0.9 } }
            `}</style>
        </div>
    );
}

const S = {
    page: {
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        backgroundImage: "radial-gradient(circle at 20% 20%, rgba(168,127,251,0.06), transparent 40%), radial-gradient(circle at 80% 80%, rgba(88,166,255,0.06), transparent 40%)",
        fontFamily: "'Inter', sans-serif",
        padding: "100px 20px 60px",
        color: "#f8fafc",
    },
    container: { maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 1 },
    header: { textAlign: "center", marginBottom: "40px" },
    title: { fontSize: "38px", fontWeight: "800", color: "#ffffff", margin: "0 0 10px" },
    subtitle: { fontSize: "16px", color: "#8b949e", maxWidth: "600px", margin: "0 auto" },

    card: {
        background: "rgba(30,41,59,0.5)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "30px",
        borderRadius: "20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    },
    cardTitle: { margin: "0 0 20px", fontSize: "17px", fontWeight: "700", color: "#e2e8f0" },
    row: { marginBottom: "14px" },

    input: {
        width: "100%", padding: "12px 16px", borderRadius: "12px",
        background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.1)",
        color: "#e2e8f0", fontSize: "14px", outline: "none", boxSizing: "border-box",
    },
    textarea: {
        width: "100%", height: "160px", padding: "15px", borderRadius: "12px",
        background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.1)",
        color: "#e2e8f0", fontSize: "14px", resize: "vertical", outline: "none",
        marginBottom: "18px", boxSizing: "border-box",
    },
    errorBox: {
        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
        color: "#fca5a5", padding: "10px 14px", borderRadius: "10px", marginBottom: "16px", fontSize: "14px",
    },
    generateBtn: {
        width: "100%", padding: "14px", borderRadius: "14px", border: "none",
        background: "linear-gradient(135deg, #a87ffb 0%, #58a6ff 100%)",
        color: "#fff", fontSize: "15px", fontWeight: "700", cursor: "pointer",
        boxShadow: "0 4px 20px rgba(168,127,251,0.4)", transition: "transform 0.2s",
    },
    loadingInner: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
    spinner: {
        display: "inline-block", width: "18px", height: "18px",
        border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
        borderRadius: "50%", animation: "spin 0.8s linear infinite",
    },

    statsRow: { display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "20px" },
    statChip: { padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600" },
    totalChip: {
        marginLeft: "auto", padding: "6px 14px", borderRadius: "20px", fontSize: "13px",
        background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)",
    },
    exportBtn: {
        padding: "6px 16px", borderRadius: "20px", border: "1px solid rgba(88,166,255,0.3)",
        background: "rgba(88,166,255,0.1)", color: "#58a6ff", fontSize: "13px", cursor: "pointer",
    },

    tabBar: { display: "flex", gap: "6px", marginBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px", flexWrap: "wrap" },
    tab: {
        padding: "8px 18px", borderRadius: "10px", border: "none",
        background: "transparent", color: "#64748b", fontSize: "14px", fontWeight: "600",
        cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s",
    },
    tabActive: { background: "rgba(168,127,251,0.15)", color: "#a87ffb" },
    tabCount: {
        padding: "2px 8px", borderRadius: "10px", fontSize: "11px",
        background: "rgba(255,255,255,0.07)", color: "#64748b",
    },
    tabCountActive: { background: "rgba(168,127,251,0.2)", color: "#a87ffb" },

    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" },

    qCard: {
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px",
    },
    qBadgeRow: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
    badge: { padding: "3px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "700", letterSpacing: "0.3px" },
    qNumber: { marginLeft: "auto", fontSize: "12px", color: "#475569" },
    qText: { margin: 0, fontSize: "14px", lineHeight: "1.6", color: "#cbd5e1", fontWeight: "500" },

    toggleBtn: {
        alignSelf: "flex-start", padding: "5px 12px", borderRadius: "8px", border: "1px solid rgba(88,166,255,0.25)",
        background: "rgba(88,166,255,0.08)", color: "#58a6ff", fontSize: "12px", cursor: "pointer",
    },
    expandSection: { display: "flex", flexDirection: "column", gap: "10px" },
    explanationBox: {
        padding: "12px", background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: "10px",
    },
    answerBox: {
        padding: "12px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)",
        borderRadius: "10px", borderLeft: "3px solid #10b981",
    },
    boxLabel: { fontSize: "11px", fontWeight: "700", color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" },
    boxLabelGreen: { fontSize: "11px", fontWeight: "700", color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" },
    boxText: { margin: 0, fontSize: "13px", lineHeight: "1.6", color: "#94a3b8" },

    skeleton: {
        height: "100px", borderRadius: "14px",
        background: "rgba(255,255,255,0.04)", marginBottom: "14px",
        animation: "pulse 1.5s ease-in-out infinite",
    },
};

export default InterviewPrep;
