import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import AIParticles from "../components/AIParticles";
import ReactMarkdown from "react-markdown";
import { Send, User, Bot, Sparkles, Trash2, BrainCircuit, Lightbulb, Code, BookOpen, UserCheck, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../config/api";

function AIChatbot() {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const [resumeText, setResumeText] = useState(localStorage.getItem("resume_text") || "");
    const [chatHistory, setChatHistory] = useState(() => {
        const saved = localStorage.getItem("chat_history");
        return saved ? JSON.parse(saved) : [];
    });
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
    }, [token, navigate]);

    useEffect(() => {
        scrollToBottom();
        localStorage.setItem("chat_history", JSON.stringify(chatHistory));
    }, [chatHistory]);

    const handleSend = async (customMessage) => {
        const msgToSend = typeof customMessage === 'string' ? customMessage : message;
        if (!msgToSend.trim()) return;

        if (!token) {
            toast.error("Please login first");
            navigate("/login");
            return;
        }

        const newHistory = [...chatHistory, { role: "user", content: msgToSend }];
        setChatHistory(newHistory);
        setMessage("");
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/chat/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: msgToSend,
                    resume_text: resumeText,
                    chat_history: newHistory.slice(0, -1)
                })
            });
            const data = await response.json();

            if (response.ok && data.reply) {
                setChatHistory([...newHistory, { role: "assistant", content: data.reply }]);
            } else {
                if (response.status === 401) {
                    localStorage.removeItem("token");
                    toast.error("Your session has expired. Please login again.");
                    navigate("/login");
                } else {
                    setChatHistory([...newHistory, { role: "assistant", content: "### ⚠️ Error\nSorry, I had trouble processing that request. " + (data.detail || "Please try again later.") }]);
                }
            }
        } catch (err) {
            console.error(err);
            setChatHistory([...newHistory, { role: "assistant", content: "### 🔌 Connection Error\nI'm having trouble reaching the mentor service. Please check your connection." }]);
        }
        setIsLoading(false);
    };

    const clearChat = () => {
        if (chatHistory.length === 0) return;
        setChatHistory([]);
        localStorage.removeItem("chat_history");
        toast.success("Chat history cleared");
    };

    const chatStarters = [
        { label: "Improve my resume", icon: <BrainCircuit size={16} />, query: "Can you analyze my resume and suggest 3 high-impact improvements with specific before/after bullet point examples?" },
        { label: "Skill roadmap", icon: <Lightbulb size={16} />, query: "Based on my background, give me a detailed 12-week learning roadmap for the top 3 skills I should develop to maximize my market value. Include specific resources for each week." },
        { label: "Interview prep", icon: <Code size={16} />, query: "What are the 5 most commonly asked technical interview questions for someone with my experience? Include the ideal answer framework for each." },
        { label: "Project ideas", icon: <BookOpen size={16} />, query: "Suggest 3 portfolio projects tailored to my skills that would impress a FAANG recruiter. For each, describe the tech stack, key features, and how to present it." },
        { label: "Salary negotiation", icon: <UserCheck size={16} />, query: "What is a fair salary range for my experience level and skills? Give me a step-by-step negotiation script I can use in my next offer discussion." },
        { label: "Career roadmap", icon: <Sparkles size={16} />, query: "Based on my current background, design a 2-year career growth roadmap with specific milestones, skills to acquire, and roles to target at each stage." },
    ];

    return (
        <div style={styles.page} className="bg-animate">
            <Navbar />
            <AIParticles />

            <div style={styles.container}>
                <div style={styles.layout}>
                    
                    {/* Left Sidebar Panel */}
                    <div style={styles.sidebar}>
                        <div style={styles.sidebarHeader}>
                            <MessageSquare size={20} color="#a87ffb" />
                            <h3 style={styles.sidebarTitle}>AI Career Mentor</h3>
                        </div>
                        
                        <div style={styles.sidebarContent}>
                            <div style={styles.contextGroup}>
                                <label style={styles.sidebarLabel}>Resume Context</label>
                                <p style={styles.hint}>The AI Mentor customizes its answers and recommendations using this context.</p>
                                <textarea
                                    style={styles.textarea}
                                    className="subtle-scrollbar"
                                    placeholder="Paste your resume text here for personalized FAANG coaching..."
                                    value={resumeText}
                                    onChange={(e) => {
                                        setResumeText(e.target.value);
                                        localStorage.setItem("resume_text", e.target.value);
                                    }}
                                />
                            </div>

                            <div style={styles.shortcutsGroup}>
                                <label style={styles.sidebarLabel}>Quick Prompts</label>
                                <div style={styles.shortcutsList}>
                                    {chatStarters.map((starter, i) => (
                                        <button
                                            key={i}
                                            style={styles.shortcutBtn}
                                            onClick={() => handleSend(starter.query)}
                                        >
                                            {starter.icon}
                                            <span>{starter.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={styles.sidebarFooter}>
                            <button 
                                style={chatHistory.length > 0 ? styles.clearBtnActive : styles.clearBtn} 
                                onClick={clearChat}
                                disabled={chatHistory.length === 0}
                            >
                                <Trash2 size={16} /> Clear Conversation
                            </button>
                        </div>
                    </div>

                    {/* Right Chat Area */}
                    <div style={styles.chatArea} className="glass-card-hover">
                        <div style={styles.chatHeader}>
                            <div style={styles.headerInfo}>
                                <Bot size={22} color="#a87ffb" />
                                <div style={styles.headerTextWrap}>
                                    <span style={styles.headerTitle}>Career Advisor GPT</span>
                                    <span style={styles.headerStatus}>Online & Ready</span>
                                </div>
                            </div>
                            <div style={styles.badgeWrapper}>
                                <Sparkles size={12} fill="#fcd34d" color="#fcd34d" />
                                <span style={styles.badgeText}>FAANG Coach Mode</span>
                            </div>
                        </div>

                        <div style={styles.messagesContainer} className="subtle-scrollbar">
                            {chatHistory.length === 0 ? (
                                <div style={styles.welcomeView}>
                                    <div style={styles.welcomeIcon}><Bot size={40} color="#a87ffb" /></div>
                                    <h2 style={styles.welcomeTitle}>AI Career Mentor — FAANG Level</h2>
                                    <p style={styles.welcomeText}>
                                        Your elite career co-pilot. Paste your resume in the sidebar, then ask me anything — from resume rewrites and skill roadmaps to salary negotiation scripts and system design prep.
                                    </p>
                                    <div style={styles.welcomeGrid}>
                                        <div style={styles.infoCard}>
                                            <div style={styles.infoIcon}>📌</div>
                                            <strong>Structured Guidance</strong>
                                            <p>Every answer includes concrete timelines, before/after examples, and actionable steps — never vague advice.</p>
                                        </div>
                                        <div style={styles.infoCard}>
                                            <div style={styles.infoIcon}>📄</div>
                                            <strong>Resume-Aware</strong>
                                            <p>Paste your resume in the sidebar and every response is tailored to your exact background and experience level.</p>
                                        </div>
                                        <div style={styles.infoCard}>
                                            <div style={styles.infoIcon}>💰</div>
                                            <strong>Salary Negotiation</strong>
                                            <p>Get market-rate estimates and a word-for-word negotiation script for your next offer.</p>
                                        </div>
                                        <div style={styles.infoCard}>
                                            <div style={styles.infoIcon}>🗺️</div>
                                            <strong>Career Roadmaps</strong>
                                            <p>Receive week-by-week learning plans and 2-year career growth maps with specific role targets.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                chatHistory.map((msg, idx) => (
                                    <div key={idx} style={msg.role === "user" ? styles.userRow : styles.botRow}>
                                        <div style={msg.role === "user" ? styles.userMsg : styles.botMsg}>
                                            <div style={styles.msgHeader}>
                                                <span style={styles.msgRole}>
                                                    {msg.role === "user" ? <User size={12} /> : <Bot size={12} />}
                                                    {msg.role === "user" ? "You" : "AI Mentor"}
                                                </span>
                                            </div>
                                            <div style={styles.msgContent} className="markdown-content">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            {isLoading && (
                                <div style={styles.botRow}>
                                    <div style={styles.botMsg}>
                                        <div style={styles.msgHeader}>
                                            <span style={styles.msgRole}>
                                                <Bot size={12} /> AI Mentor
                                            </span>
                                        </div>
                                        <div style={styles.typingIndicator}>
                                            <span></span><span></span><span></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div style={styles.inputArea}>
                            <input
                                style={styles.input}
                                placeholder="Type a message or choose a quick prompt..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            />
                            <button
                                style={message.trim() ? styles.sendBtnActive : styles.sendBtn}
                                onClick={handleSend}
                                disabled={isLoading || !message.trim()}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            <style>{`
                @keyframes typing {
                    0%, 100% { transform: translateY(0); opacity: 0.4; }
                    50% { transform: translateY(-4px); opacity: 1; }
                }
                .typing-indicator {
                    display: flex;
                    gap: 5px;
                    padding: 8px 5px;
                    align-items: center;
                }
                .typing-indicator span {
                    display: inline-block;
                    width: 6px;
                    height: 6px;
                    background-color: #a87ffb;
                    border-radius: 50%;
                    animation: typing 1s infinite ease-in-out;
                }
                .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
                .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

                /* Markdown styling inside bubbles */
                .markdown-content p {
                    margin: 0 0 10px 0;
                    line-height: 1.6;
                }
                .markdown-content p:last-child {
                    margin-bottom: 0;
                }
                .markdown-content ul, .markdown-content ol {
                    margin: 0 0 10px 0;
                    padding-left: 20px;
                }
                .markdown-content li {
                    margin-bottom: 5px;
                    line-height: 1.5;
                }
                .markdown-content strong {
                    color: #fff;
                }
                .markdown-content code {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 2px 5px;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 13px;
                }

                .bg-animate {
                    background-size: 200% 200%;
                    animation: bgShift 20s ease-in-out infinite;
                }
                @keyframes bgShift {
                    0% { background-position: 0% 0%; }
                    50% { background-position: 100% 100%; }
                    100% { background-position: 0% 0%; }
                }
                
                .subtle-scrollbar::-webkit-scrollbar {
                    width: 6px;
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
        padding: "90px 20px 30px",
        fontFamily: "'Outfit', sans-serif",
    },
    container: {
        width: "100%",
        maxWidth: "1300px",
        margin: "0 auto",
        height: "82vh",
        display: "flex",
        flexDirection: "column",
    },
    layout: {
        display: "flex",
        gap: "24px",
        height: "100%",
        flexWrap: "nowrap",
    },
    sidebar: {
        width: "320px",
        background: "rgba(10, 20, 38, 0.5)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "24px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        boxSizing: "border-box",
        flexShrink: 0,
    },
    sidebarHeader: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "20px",
    },
    sidebarTitle: {
        margin: 0,
        fontSize: "18px",
        fontWeight: "700",
        background: "linear-gradient(to right, #ffffff, #a87ffb)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
    },
    sidebarContent: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        paddingRight: "4px",
    },
    contextGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    sidebarLabel: {
        fontSize: "13px",
        fontWeight: "600",
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    hint: {
        fontSize: "11px",
        color: "#64748b",
        margin: 0,
        lineHeight: "1.4",
    },
    textarea: {
        height: "140px",
        width: "100%",
        padding: "12px",
        borderRadius: "12px",
        background: "rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        color: "#cbd5e1",
        fontSize: "13px",
        lineHeight: "1.5",
        resize: "none",
        outline: "none",
        transition: "border-color 0.2s",
        fontFamily: "inherit",
        boxSizing: "border-box",
    },
    shortcutsGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    shortcutsList: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    shortcutBtn: {
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "10px 14px",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        color: "#cbd5e1",
        fontSize: "13px",
        fontWeight: "500",
        textAlign: "left",
    },
    sidebarFooter: {
        paddingTop: "15px",
        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
    },
    clearBtn: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        background: "transparent",
        color: "#475569",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "12px",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "not-allowed",
    },
    clearBtnActive: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        background: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        color: "#f87171",
        padding: "12px",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    chatArea: {
        flex: 1,
        background: "rgba(10, 20, 38, 0.35)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "24px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
    },
    chatHeader: {
        padding: "18px 24px",
        background: "rgba(0, 0, 0, 0.2)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerInfo: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },
    headerTextWrap: {
        display: "flex",
        flexDirection: "column",
    },
    headerTitle: {
        fontSize: "15px",
        fontWeight: "700",
        color: "#fff",
    },
    headerStatus: {
        fontSize: "11px",
        color: "#10b981",
        fontWeight: "500",
    },
    badgeWrapper: {
        background: "rgba(168, 127, 251, 0.1)",
        border: "1px solid rgba(168, 127, 251, 0.2)",
        padding: "4px 10px",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },
    badgeText: {
        fontSize: "11px",
        color: "#a87ffb",
        fontWeight: "600",
    },
    messagesContainer: {
        flex: 1,
        overflowY: "auto",
        padding: "24px 30px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    welcomeView: {
        margin: "auto",
        maxWidth: "500px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        padding: "20px",
    },
    welcomeIcon: {
        width: "60px",
        height: "60px",
        background: "rgba(168, 127, 251, 0.1)",
        border: "1px solid rgba(168, 127, 251, 0.2)",
        borderRadius: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    welcomeTitle: {
        fontSize: "22px",
        fontWeight: "800",
        margin: 0,
        background: "linear-gradient(to right, #fff, #94a3b8)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
    },
    welcomeText: {
        fontSize: "14px",
        color: "#94a3b8",
        lineHeight: "1.6",
        margin: 0,
    },
    welcomeGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "15px",
        width: "100%",
        marginTop: "10px",
    },
    infoCard: {
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "16px",
        padding: "16px",
        textAlign: "left",
    },
    infoIcon: {
        fontSize: "20px",
        marginBottom: "8px",
    },
    userRow: {
        display: "flex",
        justifyContent: "flex-end",
        width: "100%",
    },
    botRow: {
        display: "flex",
        justifyContent: "flex-start",
        width: "100%",
    },
    userMsg: {
        background: "linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)",
        border: "1px solid rgba(168, 127, 251, 0.2)",
        color: "#fff",
        padding: "14px 18px",
        borderRadius: "20px 20px 4px 20px",
        maxWidth: "75%",
        boxShadow: "0 10px 25px -10px rgba(109, 40, 217, 0.3)",
    },
    botMsg: {
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        color: "#e2e8f0",
        padding: "14px 18px",
        borderRadius: "20px 20px 20px 4px",
        maxWidth: "75%",
    },
    msgHeader: {
        display: "flex",
        alignItems: "center",
        marginBottom: "8px",
        fontSize: "11px",
        color: "#94a3b8",
        fontWeight: "600",
    },
    msgRole: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    msgContent: {
        fontSize: "14px",
    },
    inputArea: {
        padding: "18px 24px",
        background: "rgba(0, 0, 0, 0.2)",
        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        display: "flex",
        gap: "12px",
    },
    input: {
        flex: 1,
        padding: "14px 18px",
        borderRadius: "14px",
        background: "rgba(0, 0, 0, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        color: "#fff",
        fontSize: "14px",
        outline: "none",
        transition: "all 0.2s",
    },
    sendBtn: {
        width: "48px",
        height: "48px",
        borderRadius: "14px",
        border: "none",
        background: "rgba(255, 255, 255, 0.02)",
        color: "#475569",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "not-allowed",
    },
    sendBtnActive: {
        width: "48px",
        height: "48px",
        borderRadius: "14px",
        border: "none",
        background: "linear-gradient(135deg, #a87ffb 0%, #7c3aed 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
        transition: "all 0.2s ease",
    }
};

export default AIChatbot;
