import { useState } from "react";
import Navbar from "../components/Navbar";
import AIParticles from "../components/AIParticles";

function InterviewPrep() {
    const [resumeText, setResumeText] = useState(localStorage.getItem("resume_text") || "");
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedAnswers, setExpandedAnswers] = useState({});

    const toggleAnswer = (idx) => {
        setExpandedAnswers((prev) => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    const handleGenerate = async () => {
        if (!resumeText) {
            alert("Please provide some resume text first!");
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please login first");
            return;
        }

        localStorage.setItem("resume_text", resumeText); // Save for later

        setIsLoading(true);
        try {
            const response = await fetch("http://127.0.0.1:8000/interview/generate/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ resume_text: resumeText })
            });
            const data = await response.json();
            if (response.ok && data.questions) {
                setQuestions(data.questions);
            } else {
                if (response.status === 401) {
                    localStorage.removeItem("token");
                    alert("Your session has expired. Please login again to continue.");
                    window.location.href = "/login";
                } else {
                    alert("Failed to generate questions. " + (data.detail || ""));
                }
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred while generating questions.");
        }
        setIsLoading(false);
    };

    return (
        <div style={styles.page} className="bg-animate">
            <Navbar />
            <AIParticles />

            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>AI Interview Prep <span style={styles.badgeSparkle}>🎙️</span></h1>
                    <p style={styles.subtitle}>Generate personalized interview questions based on your resume</p>
                </div>

                <div style={styles.card} className="glass-card-hover">
                    <h3 style={styles.cardSectionTitle}>Your Resume Context</h3>
                    <textarea
                        style={styles.textarea}
                        placeholder="Paste your resume text here..."
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                    />
                    <button style={styles.generateBtn} className="btn-glow" onClick={handleGenerate} disabled={isLoading}>
                        {isLoading ? "Generating Questions..." : "Generate Interview Questions"}
                    </button>
                </div>

                {questions.length > 0 && (
                    <div style={{ ...styles.card, marginTop: "30px" }} className="glass-card-hover">
                        <h3 style={styles.cardSectionTitle}>Personalized Questions</h3>
                        <div style={styles.grid}>
                            {questions.map((q, idx) => (
                                <div key={idx} style={styles.questionCard}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <span style={styles.categoryBadge}>{q.category || "General"}</span>
                                        {q.answer && (
                                            <button 
                                                style={styles.toggleBtn} 
                                                onClick={() => toggleAnswer(idx)}
                                                title={expandedAnswers[idx] ? "Hide Answer" : "Show Answer"}
                                            >
                                                {expandedAnswers[idx] ? "🙈 Hiding" : "👁️ Show Answer"}
                                            </button>
                                        )}
                                    </div>
                                    <p style={styles.questionText}>{q.question}</p>
                                    
                                    {expandedAnswers[idx] && q.answer && (
                                        <div style={styles.answerBox}>
                                            <div style={styles.answerHeader}>💡 AI Suggestion</div>
                                            <p style={styles.answerText}>{q.answer}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
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
        padding: "100px 20px 40px",
        color: "#f8fafc",
    },
    container: {
        width: "100%",
        maxWidth: "900px",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
    },
    header: {
        textAlign: "center",
        marginBottom: "40px",
    },
    title: {
        fontSize: "36px",
        fontWeight: "800",
        color: "#ffffff",
        margin: "0 0 10px 0",
    },
    badgeSparkle: {
        fontSize: "24px",
    },
    subtitle: {
        fontSize: "16px",
        color: "#8b949e",
    },
    card: {
        background: "rgba(30, 41, 59, 0.4)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "30px",
        borderRadius: "24px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    },
    cardSectionTitle: {
        margin: "0 0 15px 0",
        fontSize: "18px",
        fontWeight: "600",
    },
    textarea: {
        width: "100%",
        height: "150px",
        padding: "15px",
        borderRadius: "12px",
        background: "rgba(15, 23, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "#e2e8f0",
        fontSize: "14px",
        resize: "none",
        outline: "none",
        marginBottom: "20px",
    },
    generateBtn: {
        padding: "12px 24px",
        borderRadius: "12px",
        border: "none",
        background: "linear-gradient(135deg, #a87ffb 0%, #58a6ff 100%)",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "600",
        cursor: "pointer",
        width: "100%",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "20px",
    },
    questionCard: {
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "20px",
        borderRadius: "16px",
    },
    categoryBadge: {
        background: "rgba(168, 127, 251, 0.2)",
        color: "#a87ffb",
        padding: "4px 10px",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: "600",
        display: "inline-block",
        marginBottom: "10px",
    },
    questionText: {
        margin: 0,
        fontSize: "15px",
        lineHeight: "1.5",
        color: "#cbd5e1",
    },
    toggleBtn: {
        background: "rgba(56, 189, 248, 0.1)",
        border: "1px solid rgba(56, 189, 248, 0.3)",
        color: "#38bdf8",
        padding: "4px 8px",
        borderRadius: "6px",
        fontSize: "12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        transition: "all 0.2s ease",
    },
    answerBox: {
        marginTop: "15px",
        padding: "15px",
        background: "rgba(16, 185, 129, 0.05)",
        border: "1px solid rgba(16, 185, 129, 0.2)",
        borderRadius: "10px",
        borderLeft: "3px solid #10b981",
    },
    answerHeader: {
        fontSize: "12px",
        fontWeight: "700",
        color: "#10b981",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        marginBottom: "8px",
    },
    answerText: {
        margin: 0,
        fontSize: "14px",
        lineHeight: "1.5",
        color: "#a7f3d0",
    }
};

export default InterviewPrep;
