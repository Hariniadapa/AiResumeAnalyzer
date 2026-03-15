import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AIParticles from "../components/AIParticles";
import Navbar from "../components/Navbar";

function JobCenter() {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const [jobs, setJobs] = useState([]);
    const [trends, setTrends] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scraping, setScraping] = useState(false);
    const [searchQuery, setSearchQuery] = useState("Software Engineer");
    const [resumeHistory, setResumeHistory] = useState([]);
    const [selectedResume, setSelectedResume] = useState(null);
    const hasRunMatchRef = useRef(false);

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        fetchHistory();
        fetchTrends();
    }, [token, navigate]);

    useEffect(() => {
        if (selectedResume && jobs.length === 0 && !hasRunMatchRef.current) {
            hasRunMatchRef.current = true;
            handleMatch();
        }
    }, [selectedResume, jobs.length]);

    const fetchHistory = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/upload-history/", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401) {
                localStorage.removeItem("token");
                window.location.href = "/login";
                return;
            }
            const data = await res.json();
            setResumeHistory(data);
            if (data.length > 0) {
                setSelectedResume(data[0]);
            }
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    };

    const fetchTrends = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/jobs/trends/", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401) {
                localStorage.removeItem("token");
                window.location.href = "/login";
                return;
            }
            const data = await res.json();
            setTrends(data);
        } catch (error) {
            console.error("Error fetching trends:", error);
        }
    };

    const handleScrape = async () => {
        setScraping(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/jobs/scrape/?query=${encodeURIComponent(searchQuery)}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401) {
                localStorage.removeItem("token");
                window.location.href = "/login";
                return;
            }
            alert("Job data collection successful!");
        } catch (error) {
            alert("Scraping failed.");
        } finally {
            setScraping(false);
        }
    };

    const handleMatch = async () => {
        setLoading(true);
        try {
            const fullText = localStorage.getItem("resume_text");
            const resumeInput = fullText || selectedResume?.job_recommendation_summary || "Software Developer with React and Python skills";

            const res = await fetch("http://127.0.0.1:8000/jobs/recommend/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ resume_text: resumeInput })
            });
            if (res.status === 401) {
                localStorage.removeItem("token");
                window.location.href = "/login";
                return;
            }
            const data = await res.json();
            setJobs(data);
        } catch (error) {
            console.error("Matching error:", error);
        } finally {
            setLoading(false);
        }
    };

    const internJobs = jobs.filter(j => j.job_type === "Internship" || j.job_role_title?.toLowerCase().includes("intern") || j.experience_level?.toLowerCase().includes("intern"));
    const fullTimeJobs = jobs.filter(j => !internJobs.includes(j));

    const renderJobCard = (job, idx, typeColor) => (
        <div key={idx} style={{...styles.jobCard, borderLeft: `4px solid ${typeColor}`}}>
            <div style={styles.jobHeader}>
                <h4 style={styles.jobTitle}>{job.job_role_title}</h4>
                <div style={{...styles.jobDurationBadge, color: typeColor, background: `${typeColor}20`, border: `1px solid ${typeColor}40`}}>
                    {job.experience_level}
                </div>
            </div>

            <div style={styles.jobDetails}>
                <div style={styles.detailRow}>
                    <span style={styles.detailIcon}>💰</span>
                    <span style={styles.detailText}><strong>Salary/Stipend:</strong> {job.salary_or_stipend}</span>
                </div>
                <div style={styles.detailRow}>
                    <span style={styles.detailIcon}>⏳</span>
                    <span style={styles.detailText}><strong>Duration/Level:</strong> {job.experience_level}</span>
                </div>
            </div>

            <div style={styles.skillsSection}>
                <span style={styles.skillLabel}>Required Skills:</span>
                <div style={styles.skillGroup}>
                    {job.required_skills?.map((s, i) => (
                        <span key={i} style={styles.matchedSkill}>{s}</span>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: '20px' }}>
                <a href={job.job_link} target="_blank" rel="noreferrer" style={styles.linkedinBtn}>
                    <span style={{marginRight: '8px'}}>🔗</span> View on LinkedIn
                </a>
            </div>
        </div>
    );

    return (
        <div style={styles.page}>
            <Navbar />
            <AIParticles />

            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>AI Job Recommendation Engine</h1>
                    <p style={styles.subtitle}>Matching your unique profile with global opportunities</p>
                </div>

                <div style={styles.grid}>
                    {/* Left Column: Controls & Trends */}
                    <div style={styles.sideCol}>
                        <div style={styles.glassCard}>
                            <h3 style={styles.cardTitle}>Data Collection</h3>
                            <div style={styles.inputGroup}>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search Job Title..."
                                    style={styles.input}
                                />
                                <button
                                    onClick={handleScrape}
                                    disabled={scraping}
                                    style={scraping ? styles.btnDisabled : styles.scrapeBtn}
                                >
                                    {scraping ? "Extracting..." : "Collect Jobs"}
                                </button>
                            </div>
                            <p style={styles.hint}>Trigger Selenium automation to scan job platforms for analytical trends.</p>
                        </div>

                        {trends && (
                            <div style={styles.glassCard}>
                                <h3 style={styles.cardTitle}>Market Trends <span style={styles.sparkle}>🔥</span></h3>
                                <div style={styles.trendsList}>
                                    {trends.trending_skills?.map((skill, i) => (
                                        <div key={i} style={styles.trendTag}>
                                            <span style={styles.trendDot}></span> {skill}
                                        </div>
                                    ))}
                                </div>
                                <p style={styles.trendAnalysis}>{trends.analysis}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Recommendations */}
                    <div style={styles.mainCol}>
                        <div style={styles.matchControls}>
                            <h3 style={styles.cardTitle}>Personalized Matches</h3>
                            <button onClick={handleMatch} disabled={loading} style={styles.matchBtn}>
                                {loading ? "Analyzing Profile..." : "Refresh Recommendations"}
                            </button>
                        </div>

                        {loading ? (
                            <div style={styles.loader}>Searching through highly relevant job & internship vectors...</div>
                        ) : jobs.length > 0 ? (
                            <div style={styles.resultsContainer}>
                                {fullTimeJobs.length > 0 && (
                                    <div style={styles.jobSection}>
                                        <h4 style={styles.sectionHeading}>💼 Full-Time Roles</h4>
                                        <div style={styles.jobList}>
                                            {fullTimeJobs.map((job, idx) => renderJobCard(job, idx, '#a87ffb'))}
                                        </div>
                                    </div>
                                )}
                                
                                {internJobs.length > 0 && (
                                    <div style={styles.jobSection}>
                                        <h4 style={styles.sectionHeading}>🎓 Internship Opportunities</h4>
                                        <div style={styles.jobList}>
                                            {internJobs.map((job, idx) => renderJobCard(job, idx, '#34d399'))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={styles.emptyState}>
                                <p>No recommendations yet. Start by checking your history or refreshing.</p>
                            </div>
                        )}
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
        backgroundImage: "radial-gradient(circle at top right, #1e293b, #0f172a 70%)",
        color: "#f8fafc",
        padding: "100px 20px 40px",
        fontFamily: "'Inter', sans-serif",
    },
    container: {
        maxWidth: "1200px",
        margin: "0 auto",
    },
    header: {
        textAlign: "center",
        marginBottom: "40px",
    },
    title: {
        fontSize: "36px",
        fontWeight: "800",
        background: "linear-gradient(to right, #ffffff, #a87ffb)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        marginBottom: "10px",
    },
    subtitle: {
        color: "#94a3b8",
        fontSize: "18px",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "350px 1fr",
        gap: "30px",
    },
    sideCol: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    glassCard: {
        background: "rgba(30, 41, 59, 0.4)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "25px",
        borderRadius: "20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    },
    cardTitle: {
        fontSize: "18px",
        fontWeight: "700",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    input: {
        padding: "12px 15px",
        borderRadius: "10px",
        background: "rgba(0,0,0,0.2)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#fff",
        fontSize: "14px",
    },
    scrapeBtn: {
        padding: "12px",
        borderRadius: "10px",
        background: "#a87ffb",
        color: "#fff",
        border: "none",
        fontWeight: "600",
        cursor: "pointer",
        transition: "opacity 0.2s",
    },
    btnDisabled: {
        padding: "12px",
        borderRadius: "10px",
        background: "#4b5563",
        color: "#9ca3af",
        border: "none",
        cursor: "not-allowed",
    },
    hint: {
        fontSize: "12px",
        color: "#64748b",
        marginTop: "10px",
    },
    trendsList: {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        marginBottom: "15px",
    },
    trendTag: {
        background: "rgba(168, 127, 251, 0.1)",
        border: "1px solid rgba(168, 127, 251, 0.2)",
        padding: "6px 12px",
        borderRadius: "20px",
        fontSize: "13px",
        color: "#a87ffb",
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },
    trendDot: {
        width: "6px",
        height: "6px",
        background: "#a87ffb",
        borderRadius: "50%",
        boxShadow: "0 0 8px #a87ffb",
    },
    trendAnalysis: {
        fontSize: "14px",
        lineHeight: "1.6",
        color: "#94a3b8",
    },
    mainCol: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    matchControls: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    matchBtn: {
        padding: "10px 20px",
        borderRadius: "12px",
        background: "linear-gradient(to right, #3b82f6, #6366f1)",
        color: "#fff",
        border: "none",
        fontWeight: "600",
        cursor: "pointer",
        boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
    },
    resultsContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "35px",
    },
    jobSection: {
        display: "flex",
        flexDirection: "column",
        gap: "15px",
    },
    sectionHeading: {
        fontSize: "20px",
        fontWeight: "700",
        color: "#f8fafc",
        margin: "0 0 5px 0",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        paddingBottom: "10px"
    },
    jobList: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    jobCard: {
        background: "rgba(30, 41, 59, 0.4)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "25px",
        borderRadius: "24px",
        position: "relative",
        transition: "transform 0.3s ease",
    },
    jobHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "15px",
    },
    jobTitle: {
        fontSize: "22px",
        fontWeight: "700",
        margin: 0,
        color: "#f8fafc",
    },
    jobDurationBadge: {
        padding: "6px 12px",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: "600",
    },
    jobDetails: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginBottom: "20px",
        background: "rgba(0,0,0,0.2)",
        padding: "15px",
        borderRadius: "12px",
    },
    detailRow: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },
    detailIcon: {
        fontSize: "16px",
    },
    detailText: {
        color: "#e2e8f0",
        fontSize: "14px",
    },
    skillsSection: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginBottom: "10px",
    },
    skillGroup: {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        alignItems: "center",
    },
    skillLabel: {
        fontSize: "14px",
        fontWeight: "700",
        color: "#10b981",
        width: "120px",
        marginBottom: "4px"
    },
    matchedSkill: {
        background: "rgba(16, 185, 129, 0.1)",
        padding: "6px 12px",
        borderRadius: "8px",
        fontSize: "13px",
        color: "#34d399",
        border: "1px solid rgba(16, 185, 129, 0.2)",
        fontWeight: "500"
    },
    linkedinBtn: {
        display: "inline-flex",
        alignItems: "center",
        padding: "12px 24px",
        background: "linear-gradient(135deg, #0077b5 0%, #005582 100%)",
        color: "#fff",
        borderRadius: "12px",
        textDecoration: "none",
        fontSize: "15px",
        fontWeight: "600",
        transition: "all 0.3s ease",
        boxShadow: "0 4px 15px rgba(0, 119, 181, 0.3)",
    },
    loader: {
        textAlign: "center",
        padding: "50px",
        color: "#94a3b8",
        fontStyle: "italic",
    },
    emptyState: {
        textAlign: "center",
        padding: "100px 50px",
        background: "rgba(30, 41, 59, 0.2)",
        borderRadius: "24px",
        border: "1px dashed rgba(255,255,255,0.1)",
        color: "#64748b",
    },
    sparkle: {
        fontSize: "20px",
    }
};

export default JobCenter;

