import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import AIParticles from "../components/AIParticles";
import ReactMarkdown from "react-markdown";
import { Send, User, Bot, Sparkles, Trash2, ArrowLeft, BrainCircuit, Lightbulb, Code, BookOpen } from "lucide-react";

function AIChatbot() {
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
        scrollToBottom();
        localStorage.setItem("chat_history", JSON.stringify(chatHistory));
    }, [chatHistory]);

    const handleSend = async (customMessage) => {
        const msgToSend = typeof customMessage === 'string' ? customMessage : message;
        if (!msgToSend.trim()) return;

        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please login first");
            return;
        }

        const newHistory = [...chatHistory, { role: "user", content: msgToSend }];
        setChatHistory(newHistory);
        setMessage("");
        setIsLoading(true);

        try {
            const response = await fetch("http://127.0.0.1:8000/chat/", {
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
                    alert("Your session has expired. Please login again to continue.");
                    window.location.href = "/login";
                } else {
                    setChatHistory([...newHistory, { role: "assistant", content: "### ⚠️ Error\nSorry, I had trouble processing that request. " + (data.detail || "Please try again later.") }]);
                }
            }
        } catch (err) {
            console.error(err);
            setChatHistory([...newHistory, { role: "assistant", content: "### 🔌 Connection Error\nI'm having trouble reaching the mentor service. Please check your internet connection or try again later." }]);
        }
        setIsLoading(false);
    };

    const clearChat = () => {
        if (window.confirm("Are you sure you want to clear the chat history?")) {
            setChatHistory([]);
            localStorage.removeItem("chat_history");
        }
    };

    const chatStarters = [
        { label: "Improve my resume", icon: <BrainCircuit size={16} />, query: "Can you analyze my resume and suggest 3 high-impact improvements?" },
        { label: "Skill roadmap", icon: <Lightbulb size={16} />, query: "Based on my background, what are the top 3 skills I should learn next to increase my market value?" },
        { label: "Interview tips", icon: <Code size={16} />, query: "What are the most common technical interview questions for someone with my experience?" },
        { label: "Project ideas", icon: <BookOpen size={16} />, query: "Suggest a portfolio project that would showcase my current skills while helping me learn something new." }
    ];

    return (
        <div style={styles.page} className="bg-animate">
            <Navbar />
            <AIParticles />

            <div style={styles.container}>
                <div style={styles.header}>
                    <div style={styles.titleWrapper}>
                        <h1 style={styles.title}>AI Career Mentor <span style={styles.sparkle}><Sparkles fill="#fcd34d" color="#fcd34d" /></span></h1>
                    </div>
                    <div style={styles.statusBadge}>
                        <div style={styles.statusDot}></div>
                        <span>AI Engine Active (Heuristic Fallback Enabled)</span>
                    </div>
                    <p style={styles.subtitle}>Your personal guide to career growth and professional success</p>
                </div>

                <div style={styles.layout}>
                    {/* Left: Settings/Context */}
                    <div style={styles.sidebar}>
                        <div style={styles.sidebarHeader}>
                            <h3 style={styles.cardSectionTitle}>Resume Context</h3>
                        </div>
                        <p style={styles.hint}>The mentor uses this text to personalize your advice.</p>
                        <textarea
                            style={styles.textarea}
                            className="subtle-scrollbar"
                            placeholder="Paste your resume text here for better context..."
                            value={resumeText}
                            onChange={(e) => {
                                setResumeText(e.target.value);
                                localStorage.setItem("resume_text", e.target.value);
                            }}
                        />
                        <div style={styles.sidebarFooter}>
                            <button 
                                style={styles.clearBtn} 
                                onClick={clearChat}
                                className="clear-btn-hover"
                            >
                                <Trash2 size={16} /> Clear Conversation
                            </button>
                        </div>
                    </div>

                    {/* Right: Chat View */}
                    <div style={styles.chatArea} className="glass-card-hover">
                        <div style={styles.messagesContainer} className="subtle-scrollbar">
                            {chatHistory.length === 0 && (
                                <div style={styles.welcomeView}>
                                    <div style={styles.welcomeIcon}><Bot size={48} color="#3b82f6" /></div>
                                    <h2 style={styles.welcomeTitle}>Hello! I'm your AI Mentor.</h2>
                                    <p style={styles.welcomeText}>How can I help you advance your career today?</p>

                                    <div style={styles.starterGrid}>
                                        {chatStarters.map((starter, i) => (
                                            <button
                                                key={i}
                                                style={styles.starterCard}
                                                onClick={() => handleSend(starter.query)}
                                            >
                                                <div style={styles.starterIcon}>{starter.icon}</div>
                                                <span>{starter.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {chatHistory.map((msg, idx) => (
                                <div key={idx} style={msg.role === "user" ? styles.userMsgW : styles.botMsgW}>
                                    <div style={msg.role === "user" ? styles.avatarUser : styles.avatarBot}>
                                        {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
                                    </div>
                                    <div style={msg.role === "user" ? styles.userMsg : styles.botMsg}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div style={styles.botMsgW}>
                                    <div style={styles.avatarBot}><Bot size={18} className="animate-pulse" /></div>
                                    <div style={styles.botMsg}>
                                        <div style={styles.typingIndicator} className="typing-indicator">
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
                                placeholder="Ask anything about your career..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            />
                            <button
                                style={message.trim() ? styles.sendBtnActive : styles.sendBtn}
                                onClick={handleSend}
                                disabled={isLoading || !message.trim()}
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .animate-pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
                
                @keyframes typing {
                    0%, 100% { transform: translateY(0); opacity: 0.4; }
                    50% { transform: translateY(-5px); opacity: 1; }
                }
                .typing-indicator span {
                    display: inline-block;
                    width: 6px;
                    height: 6px;
                    background-color: #3b82f6;
                    border-radius: 50%;
                    animation: typing 1s infinite ease-in-out;
                }
                .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
                .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

                .bg-animate {
                    background-size: 400% 400%;
                    animation: gradientBG 15s ease infinite;
                }
                @keyframes gradientBG {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .clear-btn-hover:hover {
                    background: rgba(245, 158, 11, 0.15) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.2) !important;
                }
                
                /* Premium Scrollbar */
                .subtle-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .subtle-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .subtle-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 10px;
                }
                .subtle-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.05);
                }
            `}</style>
        </div>
    );
}

const styles = {
    page: {
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        backgroundImage: "radial-gradient(circle at top right, #1e293b, #0f172a 70%), radial-gradient(circle at bottom left, #1e1b4b, #0f172a 70%)",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        padding: "100px 20px 40px",
        color: "#f8fafc",
    },
    container: {
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
    },
    header: {
        textAlign: "center",
        marginBottom: "40px",
    },
    titleWrapper: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
    },
    title: {
        fontSize: "42px",
        fontWeight: "800",
        letterSpacing: "-0.025em",
        background: "linear-gradient(to right, #ffffff, #94a3b8)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        margin: "0 0 10px 0",
    },
    sparkle: {
        display: "inline-flex",
        verticalAlign: "middle",
        marginLeft: "8px",
    },
    subtitle: {
        fontSize: "18px",
        color: "#94a3b8",
        fontWeight: "400",
        maxWidth: "600px",
        margin: "0 auto",
    },
    statusBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        background: "rgba(16, 185, 129, 0.1)",
        border: "1px solid rgba(16, 185, 129, 0.2)",
        padding: "6px 14px",
        borderRadius: "20px",
        fontSize: "13px",
        color: "#10b981",
        fontWeight: "600",
        marginTop: "10px",
        marginBottom: "15px",
    },
    statusDot: {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: "#10b981",
        boxShadow: "0 0 10px #10b981",
        animation: "pulse 2s infinite ease-in-out",
    },
    layout: {
        display: "flex",
        gap: "24px",
        flexWrap: "wrap",
    },
    sidebar: {
        background: "rgba(30, 41, 59, 0.4)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "20px",
        borderRadius: "24px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
        height: "580px",
        display: "flex",
        flexDirection: "column",
        flex: "1 1 280px",
        maxWidth: "100%",
        boxSizing: "border-box",
    },
    sidebarHeader: {
        marginBottom: "10px",
    },
    cardSectionTitle: {
        margin: "0",
        fontSize: "18px",
        fontWeight: "600",
        color: "#fff",
    },
    hint: {
        fontSize: "12px",
        color: "#94a3b8",
        marginBottom: "12px",
        lineHeight: "1.4",
    },
    textarea: {
        flex: 1,
        width: "100%",
        padding: "12px",
        borderRadius: "14px",
        background: "rgba(15, 23, 42, 0.7)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "#cbd5e1",
        fontSize: "13px",
        lineHeight: "1.5",
        resize: "none",
        outline: "none",
        transition: "border-color 0.2s",
        fontFamily: "inherit",
        boxSizing: "border-box",
    },
    sidebarFooter: {
        marginTop: "20px",
    },
    clearBtn: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        background: "rgba(245, 158, 11, 0.05)",
        backdropFilter: "blur(10px)",
        color: "#fbbf24",
        border: "1px solid rgba(245, 158, 11, 0.2)",
        padding: "12px",
        borderRadius: "14px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "0 4px 15px rgba(245, 158, 11, 0.05)",
    },
    chatArea: {
        background: "rgba(30, 41, 59, 0.4)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "24px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        height: "580px",
        overflow: "hidden",
        flex: "1 1 500px",
        maxWidth: "100%",
    },
    messagesContainer: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        padding: "32px",
    },
    welcomeView: {
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "20px",
    },
    welcomeIcon: {
        width: "80px",
        height: "80px",
        background: "rgba(59, 130, 246, 0.1)",
        borderRadius: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "20px",
    },
    welcomeTitle: {
        fontSize: "24px",
        fontWeight: "700",
        color: "#fff",
        margin: "0 0 8px 0",
    },
    welcomeText: {
        fontSize: "16px",
        color: "#94a3b8",
        marginBottom: "32px",
    },
    starterGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px",
        width: "100%",
        maxWidth: "500px",
    },
    starterCard: {
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        padding: "16px",
        borderRadius: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        cursor: "pointer",
        transition: "all 0.2s",
        textAlign: "left",
        color: "#e2e8f0",
        fontSize: "14px",
        fontWeight: "500",
    },
    starterIcon: {
        color: "#3b82f6",
    },
    userMsgW: {
        display: "flex",
        flexDirection: "row-reverse",
        gap: "12px",
        alignItems: "flex-start",
    },
    botMsgW: {
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
    },
    avatarUser: {
        width: "36px",
        height: "36px",
        borderRadius: "12px",
        background: "linear-gradient(135deg, #a87ffb, #7c3aed)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        flexShrink: 0,
    },
    avatarBot: {
        width: "36px",
        height: "36px",
        borderRadius: "12px",
        background: "rgba(59, 130, 246, 0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#3b82f6",
        flexShrink: 0,
        border: "1px solid rgba(59, 130, 246, 0.3)",
    },
    userMsg: {
        background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
        color: "#fff",
        padding: "14px 20px",
        borderRadius: "22px 4px 22px 22px",
        maxWidth: "85%",
        fontSize: "15px",
        lineHeight: "1.6",
        boxShadow: "0 8px 25px rgba(124, 58, 237, 0.25)",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
    },
    botMsg: {
        background: "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(12px)",
        color: "#e2e8f0",
        padding: "14px 20px",
        borderRadius: "4px 22px 22px 22px",
        maxWidth: "85%",
        fontSize: "15px",
        lineHeight: "1.6",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
    },
    typingIndicator: {
        display: "flex",
        gap: "4px",
        padding: "4px 0",
    },
    inputArea: {
        padding: "24px 32px",
        background: "rgba(15, 23, 42, 0.4)",
        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        display: "flex",
        gap: "12px",
    },
    input: {
        flex: 1,
        padding: "16px 20px",
        borderRadius: "18px",
        background: "rgba(15, 23, 42, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "#fff",
        fontSize: "15px",
        outline: "none",
        transition: "all 0.2s",
    },
    sendBtn: {
        width: "52px",
        height: "52px",
        borderRadius: "18px",
        border: "none",
        background: "rgba(59, 130, 246, 0.1)",
        color: "rgba(59, 130, 246, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "not-allowed",
        transition: "all 0.2s",
    },
    sendBtnActive: {
        width: "52px",
        height: "52px",
        borderRadius: "18px",
        border: "none",
        background: "#3b82f6",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
    }
};

export default AIChatbot;
