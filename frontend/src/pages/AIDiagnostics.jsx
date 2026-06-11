import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import AIParticles from "../components/AIParticles";
import { Activity, Clock, ShieldAlert, CheckCircle2, RefreshCw, Cpu, Database, AlertTriangle, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../config/api";

function AIDiagnostics() {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDiagnostics = async (showToast = false) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/debug/ai/`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.status === 401) {
                localStorage.removeItem("token");
                toast.error("Session expired, please login again");
                navigate("/login");
                return;
            }
            const resData = await response.json();
            setData(resData);
            if (showToast) {
                if (resData.test_success) {
                    toast.success("AI Connectivity test passed!");
                } else {
                    toast.error("AI Connectivity test failed: " + (resData.test_error || ""));
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to connect to the backend diagnostics API");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        fetchDiagnostics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, navigate]);

    return (
        <div style={styles.page} className="bg-animate">
            <Navbar />
            <AIParticles />

            <div style={styles.container}>
                <div style={styles.header}>
                    <button style={styles.backBtn} onClick={() => navigate("/dashboard")}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                    <h1 style={styles.title}>AI Diagnostics & QA Hub <span style={styles.badgeSparkle}>🛠️</span></h1>
                    <p style={styles.subtitle}>Audit Gemini credentials, latency metrics, and centralized error logs</p>
                </div>

                {loading && !data ? (
                    <div style={styles.loadingWrapper}>
                        <RefreshCw className="spin-icon" size={40} color="#a87ffb" />
                        <p style={styles.loadingText}>Running AI diagnostics and connectivity checks...</p>
                    </div>
                ) : (
                    <div style={styles.content}>
                        {/* Status Grid */}
                        <div style={styles.statusGrid}>
                            {/* Card 1: Key & Connection status */}
                            <div style={styles.card} className="glass-card-hover">
                                <div style={styles.cardHeader}>
                                    <Database size={20} color="#a87ffb" />
                                    <h3 style={styles.cardTitle}>Gemini Config</h3>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Provider:</span>
                                    <span style={styles.modelName}>{data?.provider || "Google Gemini"}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>API Key Status:</span>
                                    <span style={data?.api_key_present ? styles.statusSuccess : styles.statusDanger}>
                                        {data?.api_key_present ? "Present" : "Missing"}
                                    </span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Key Valid:</span>
                                    <span style={data?.api_key_valid_format ? styles.statusSuccess : styles.statusDanger}>
                                        {data?.api_key_valid_format ? "Yes" : "No"}
                                    </span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Default Model:</span>
                                    <span style={styles.modelName}>{data?.default_model}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Embedding Model:</span>
                                    <span style={styles.modelName}>{data?.embedding_model}</span>
                                </div>
                            </div>

                            {/* Card 2: Connectivity Test */}
                            <div style={styles.card} className="glass-card-hover">
                                <div style={styles.cardHeader}>
                                    <Activity size={20} color="#34d399" />
                                    <h3 style={styles.cardTitle}>Connectivity Check</h3>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Status:</span>
                                    <span style={data?.test_success ? styles.statusSuccess : styles.statusDanger}>
                                        {data?.test_success ? "Connected" : "Disconnected"}
                                    </span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Latency:</span>
                                    <span style={styles.latencyVal}>
                                        <Clock size={14} style={{ marginRight: "4px" }} />
                                        {data?.test_latency_ms} ms
                                    </span>
                                </div>
                                {data?.test_error && (
                                    <div style={styles.errorBanner}>
                                        <AlertTriangle size={14} style={{ marginRight: "6px", flexShrink: 0 }} />
                                        <span style={styles.errorBannerText}>{data.test_error}</span>
                                    </div>
                                )}
                                <button style={styles.recheckBtn} className="btn-glow" onClick={() => fetchDiagnostics(true)} disabled={loading}>
                                    {loading ? (
                                        <>
                                            <RefreshCw className="spin-icon" size={14} /> Re-checking...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={14} /> Run Connectivity Test
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Card 3: Model Info */}
                            <div style={styles.card} className="glass-card-hover">
                                <div style={styles.cardHeader}>
                                    <Cpu size={20} color="#38bdf8" />
                                    <h3 style={styles.cardTitle}>Active Model</h3>
                                </div>
                                <div style={styles.fallbackList}>
                                    <div style={styles.fallbackItemActive}>
                                        <span style={styles.indexBadge}>Primary</span>
                                        <span style={styles.fallbackModel}>{data?.default_model}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Error Logs Section */}
                        <div style={{ ...styles.card, marginTop: "30px", width: "100%" }} className="glass-card-hover">
                            <div style={styles.cardHeader}>
                                <ShieldAlert size={22} color="#f87171" />
                                <h3 style={styles.cardTitle}>Centralized AI Error Monitor</h3>
                            </div>
                            <p style={styles.sectionDesc}>Tracks real-time runtime exceptions, parsing errors, timeouts, or fallback executions across all AI modules.</p>

                            {!data?.recent_errors || data.recent_errors.length === 0 ? (
                                <div style={styles.emptyLogs}>
                                    <CheckCircle2 size={36} color="#34d399" />
                                    <p style={styles.emptyLogsText}>All clear! No AI runtime errors detected in the current session.</p>
                                </div>
                            ) : (
                                <div style={styles.tableWrapper} className="subtle-scrollbar">
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={styles.th}>Timestamp</th>
                                                <th style={styles.th}>Feature</th>
                                                <th style={styles.th}>Error Message</th>
                                                <th style={styles.th}>Model</th>
                                                <th style={styles.th}>Provider</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.recent_errors.map((err, idx) => (
                                                <tr key={idx} style={styles.tr}>
                                                    <td style={styles.td}>
                                                        {new Date(err.timestamp).toLocaleTimeString()}
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={styles.featureBadge}>{err.feature}</span>
                                                    </td>
                                                    <td style={{ ...styles.td, color: "#fca5a5", fontWeight: "500" }}>{err.error}</td>
                                                    <td style={styles.td}>{err.model}</td>
                                                    <td style={styles.td}>{err.provider}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    100% { transform: rotate(360deg); }
                }
                .spin-icon {
                    animation: spin 2s linear infinite;
                }
                .subtle-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .subtle-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .subtle-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.08);
                    border-radius: 10px;
                }
                .subtle-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
            `}</style>
        </div>
    );
}

const styles = {
    page: {
        minHeight: "100vh",
        backgroundColor: "#050B14",
        backgroundImage: "radial-gradient(circle at top right, #1e1b4b, #050b14 70%), radial-gradient(circle at bottom left, #0b1528, #050b14 70%)",
        color: "#f8fafc",
        padding: "100px 20px 40px",
        fontFamily: "'Outfit', sans-serif",
    },
    container: {
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
    },
    header: {
        textAlign: "left",
        marginBottom: "40px",
    },
    backBtn: {
        background: "transparent",
        border: "none",
        color: "#94a3b8",
        fontSize: "14px",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "15px",
        transition: "color 0.2s ease",
        padding: 0,
    },
    title: {
        fontSize: "36px",
        fontWeight: "800",
        color: "#ffffff",
        margin: "0 0 10px 0",
        background: "linear-gradient(to right, #ffffff, #a87ffb)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
    },
    badgeSparkle: {
        fontSize: "24px",
    },
    subtitle: {
        fontSize: "16px",
        color: "#94a3b8",
        margin: 0,
    },
    loadingWrapper: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 20px",
        gap: "16px",
    },
    loadingText: {
        color: "#94a3b8",
        fontSize: "16px",
        fontWeight: "500",
    },
    content: {
        display: "flex",
        flexDirection: "column",
    },
    statusGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "24px",
        width: "100%",
    },
    card: {
        background: "rgba(10, 20, 38, 0.4)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        padding: "28px",
        borderRadius: "24px",
        boxShadow: "0 10px 35px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
    },
    cardHeader: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "20px",
    },
    cardTitle: {
        margin: 0,
        fontSize: "18px",
        fontWeight: "700",
        color: "#ffffff",
    },
    infoRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
    },
    infoLabel: {
        fontSize: "14px",
        color: "#94a3b8",
        fontWeight: "500",
    },
    statusSuccess: {
        fontSize: "14px",
        color: "#34d399",
        fontWeight: "700",
    },
    statusDanger: {
        fontSize: "14px",
        color: "#f87171",
        fontWeight: "700",
    },
    urlText: {
        fontSize: "13px",
        color: "#cbd5e1",
        fontFamily: "monospace",
    },
    modelName: {
        fontSize: "13px",
        color: "#a87ffb",
        fontWeight: "600",
    },
    latencyVal: {
        fontSize: "14px",
        color: "#38bdf8",
        fontWeight: "700",
        display: "inline-flex",
        alignItems: "center",
    },
    recheckBtn: {
        marginTop: "20px",
        padding: "12px 20px",
        background: "linear-gradient(135deg, #a87ffb 0%, #7c3aed 100%)",
        color: "#fff",
        border: "none",
        borderRadius: "12px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
        transition: "all 0.2s ease",
    },
    fallbackList: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    fallbackItemActive: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(168, 127, 251, 0.1)",
        border: "1px solid rgba(168, 127, 251, 0.2)",
        padding: "10px 14px",
        borderRadius: "10px",
    },
    fallbackItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.04)",
        padding: "10px 14px",
        borderRadius: "10px",
    },
    indexBadge: {
        fontSize: "10px",
        fontWeight: "700",
        color: "#a87ffb",
        textTransform: "uppercase",
        background: "rgba(168, 127, 251, 0.2)",
        padding: "2px 6px",
        borderRadius: "4px",
    },
    indexBadgeSecondary: {
        fontSize: "10px",
        fontWeight: "700",
        color: "#94a3b8",
        textTransform: "uppercase",
        background: "rgba(255, 255, 255, 0.05)",
        padding: "2px 6px",
        borderRadius: "4px",
    },
    fallbackModel: {
        fontSize: "12px",
        color: "#cbd5e1",
        fontFamily: "monospace",
    },
    errorBanner: {
        marginTop: "12px",
        padding: "10px 14px",
        background: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        borderRadius: "10px",
        color: "#f87171",
        display: "flex",
        alignItems: "center",
    },
    errorBannerText: {
        fontSize: "12px",
        lineHeight: "1.4",
        wordBreak: "break-word",
    },
    sectionDesc: {
        fontSize: "14px",
        color: "#cbd5e1",
        margin: "0 0 20px 0",
    },
    emptyLogs: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        gap: "12px",
    },
    emptyLogsText: {
        color: "#34d399",
        fontSize: "15px",
        fontWeight: "600",
    },
    tableWrapper: {
        overflowX: "auto",
        width: "100%",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        textAlign: "left",
        fontSize: "14px",
    },
    th: {
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "12px 16px",
        color: "#94a3b8",
        fontWeight: "600",
    },
    td: {
        padding: "16px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
        color: "#cbd5e1",
        verticalAlign: "middle",
    },
    tr: {
        transition: "background 0.2s",
        "&:hover": {
            background: "rgba(255, 255, 255, 0.02)",
        }
    },
    featureBadge: {
        background: "rgba(168, 127, 251, 0.15)",
        color: "#a87ffb",
        padding: "4px 10px",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: "600",
        border: "1px solid rgba(168, 127, 251, 0.2)",
    }
};

export default AIDiagnostics;
