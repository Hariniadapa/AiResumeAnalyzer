import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AIParticles from "../components/AIParticles";
import Navbar from "../components/Navbar";
import { API_BASE_URL } from "../config/api";

function UploadHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const previousData = location.state?.data;
    const token = localStorage.getItem("token");

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/upload-history/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            }
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this history item?")) return;
        try {
            const response = await fetch(`${API_BASE_URL}/delete-history/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                setHistory(history.filter((item) => item.id !== id));
            }
        } catch (error) {
            console.error("Error deleting history:", error);
        }
    };

    return (
        <div style={styles.page} className="bg-animate">
            <Navbar />
            <AIParticles />
            <div className="animated-blob" style={styles.blob1}></div>
            <div className="animated-blob" style={{ ...styles.blob2, animationDelay: '-7.5s' }}></div>

            <div style={styles.container}>
                <div style={styles.header}>
                    <div style={styles.actionsNav}>
                        {previousData && (
                            <button style={styles.backBtn} onClick={() => navigate("/results", { state: { data: previousData } })}>
                                ← Back to Resume Summary
                            </button>
                        )}
                        <button style={styles.backBtn} className="btn-glow" onClick={() => navigate("/dashboard")}>
                            ← Back to Upload Resume
                        </button>
                    </div>
                    <h1 style={styles.title} className="typing-effect">Upload History <span style={styles.badgeSparkle}>📜</span></h1>
                    <p style={styles.subtitle}>Review and manage your previous resume analyses</p>
                </div>

                {loading ? (
                    <div style={styles.statusText}>Loading your history...</div>
                ) : history.length === 0 ? (
                    <div style={styles.statusText}>No history found. Upload a resume to get started!</div>
                ) : (
                    <div style={styles.historyList}>
                        {history.map((item, idx) => (
                            <div key={item.id} style={{ ...styles.historyCard, animationDelay: `${idx * 0.1}s` }} className="glass-card-hover">
                                <div style={styles.cardMain}>
                                    <div style={styles.fileInfo}>
                                        <div style={styles.fileIcon}>📄</div>
                                        <div>
                                            <h3 style={styles.filename}>{item.filename}</h3>
                                            <p style={styles.dateInfo}>{item.upload_date} at {item.upload_time}</p>
                                        </div>
                                    </div>
                                    <div style={styles.scoreInfo}>
                                        <div style={styles.scoreBadge}>
                                            <span style={styles.scoreValue}>{item.ats_score}%</span>
                                            <span style={styles.scoreLabel}>ATS SCORE</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.cardFooter}>
                                    <div style={styles.recommendation}>
                                        <span style={styles.recLabel}>Recommendations:</span>
                                        <span style={styles.recText}>{item.job_recommendation_summary || "Processing..."}</span>
                                    </div>
                                    <div style={styles.actions}>
                                        <button
                                            style={styles.deleteBtn}
                                            onClick={() => handleDelete(item.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
        maxWidth: "900px",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
    },
    header: {
        textAlign: "center",
        marginBottom: "40px",
    },
    actionsNav: {
        display: "flex",
        justifyContent: "center",
        gap: "20px",
        marginBottom: "20px",
        flexWrap: "wrap",
    },
    backBtn: {
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "10px 20px",
        borderRadius: "20px",
        color: "#94a3b8",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.2s ease",
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
    },
    subtitle: {
        fontSize: "18px",
        color: "#8b949e",
        fontWeight: "400",
    },
    statusText: {
        textAlign: "center",
        color: "#94a3b8",
        fontSize: "18px",
        marginTop: "50px",
    },
    historyList: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    historyCard: {
        background: "rgba(30, 41, 59, 0.4)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "24px",
        padding: "25px",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        transition: "transform 0.3s ease, border-color 0.3s ease",
        animation: "fadeInUp 0.6s ease-out forwards",
        opacity: 0,
        transform: "translateY(20px)",
    },
    cardMain: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    fileInfo: {
        display: "flex",
        alignItems: "center",
        gap: "20px",
    },
    fileIcon: {
        fontSize: "32px",
        background: "rgba(168, 127, 251, 0.1)",
        padding: "12px",
        borderRadius: "16px",
        border: "1px solid rgba(168, 127, 251, 0.2)",
    },
    filename: {
        margin: 0,
        fontSize: "18px",
        fontWeight: "600",
        color: "#ffffff",
    },
    dateInfo: {
        margin: "4px 0 0 0",
        fontSize: "14px",
        color: "#94a3b8",
    },
    scoreInfo: {
        textAlign: "right",
    },
    scoreBadge: {
        background: "rgba(168, 127, 251, 0.1)",
        border: "1px solid rgba(168, 127, 251, 0.3)",
        padding: "10px 20px",
        borderRadius: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: "100px",
    },
    scoreValue: {
        fontSize: "24px",
        fontWeight: "800",
        color: "#a87ffb",
    },
    scoreLabel: {
        fontSize: "10px",
        fontWeight: "700",
        color: "#94a3b8",
        letterSpacing: "1px",
    },
    cardFooter: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        paddingTop: "15px",
    },
    recommendation: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flex: 1,
    },
    recLabel: {
        fontSize: "13px",
        fontWeight: "600",
        color: "#8b949e",
    },
    recText: {
        fontSize: "13px",
        color: "#cbd5e1",
        fontStyle: "italic",
    },
    actions: {
        display: "flex",
        gap: "10px",
    },
    deleteBtn: {
        background: "rgba(239, 68, 68, 0.1)",
        border: "1px solid rgba(239, 68, 68, 0.3)",
        color: "#ef4444",
        padding: "6px 14px",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
};

export default UploadHistory;
