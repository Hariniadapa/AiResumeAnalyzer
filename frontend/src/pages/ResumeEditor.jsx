import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import AIParticles from "../components/AIParticles";
import { API_BASE_URL } from "../config/api";

function ResumeEditor() {
    const [token] = useState(localStorage.getItem("token"));
    const [activeTab, setActiveTab] = useState("power"); // "power", "download"
    
    // Core state
    const [resumeSections, setResumeSections] = useState({
        personal_information: {
            name: "",
            email: "",
            phone: "",
            linkedin: "",
            location: ""
        },
        summary: "",
        skills: "React, Node.js, Python, SQL",
        experience: "",
        education: "",
        projects: "",
        certifications: ""
    });

    const [atsData, setAtsData] = useState(null);
    const [skillGaps, setSkillGaps] = useState([]);
    
    // Power Tool states
    const [toolInput, setToolInput] = useState("");
    const [toolResult, setToolResult] = useState("");
    const [loadingTool, setLoadingTool] = useState("");
    const [toolError, setToolError] = useState("");

    // Setup initial parse if raw text was massive
    useEffect(() => {
        const parseResume = async () => {
            const raw = localStorage.getItem("resume_text") || "";
            const alreadyParsed = sessionStorage.getItem("last_parsed_raw");
            
            if (raw.length > 50 && alreadyParsed !== raw) {
                setLoadingTool("parsing");
                try {
                    const res = await fetch(`${API_BASE_URL}/resume/parse-sections/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                        body: JSON.stringify({ resume_text: raw })
                    });
                    const data = await res.json();
                    if (data && data.summary !== undefined) {
                        const getSafeStr = (val) => {
                            if (typeof val === 'string') return val;
                            if (Array.isArray(val)) return val.join(", ");
                            if (val && typeof val === 'object') return JSON.stringify(val, null, 2);
                            return String(val || "");
                        };
                        
                        const passedInfo = data.personal_information || {};
                        const safeInfo = {
                            name: getSafeStr(passedInfo.name),
                            email: getSafeStr(passedInfo.email),
                            phone: getSafeStr(passedInfo.phone),
                            linkedin: getSafeStr(passedInfo.linkedin),
                            location: getSafeStr(passedInfo.location)
                        };
                            
                        setResumeSections({
                            personal_information: safeInfo,
                            summary: getSafeStr(data.summary),
                            skills: getSafeStr(data.skills),
                            experience: getSafeStr(data.experience),
                            education: getSafeStr(data.education),
                            projects: getSafeStr(data.projects),
                            certifications: getSafeStr(data.certifications)
                        });
                        sessionStorage.setItem("last_parsed_raw", raw);
                    }
                } catch (err) {
                    console.error("Parse error", err);
                }
                setLoadingTool("");
            } else if (!raw) {
                setResumeSections({
                    personal_information: {
                        name: "Jane Doe",
                        email: "jane@example.com",
                        phone: "555-0100",
                        linkedin: "",
                        location: ""
                    },
                    summary: "A passionate software engineer with experience in React and Node.js.",
                    skills: "React, Node.js, Python, SQL",
                    experience: "Software Engineer at TechCorp (2020-Present)\n- Built web applications\n- Managed databases",
                    education: "B.S. Computer Science, University of Technology",
                    projects: "E-commerce Website\n- Created a shopping cart",
                    certifications: "AWS Certified Developer"
                });
            }
        };
        parseResume();
    }, [token]);

    // HANDLERS
    const handleSectionChange = (section, value) => {
        setResumeSections(prev => ({...prev, [section]: value}));
    };

    const handleRewriteSection = async (sectionKey, mode) => {
        setLoadingTool(`rewriting_${sectionKey}`);
        setToolError("");
        try {
            const res = await fetch(`${API_BASE_URL}/resume/rewrite-section/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ text: resumeSections[sectionKey], mode: mode })
            });
            if (!res.ok) throw new Error("Request failed");
            const data = await res.json();
            if (data.rewritten_text) {
                if (window.confirm("Review new text:\n\n" + data.rewritten_text + "\n\nAccept these changes?")) {
                    handleSectionChange(sectionKey, data.rewritten_text);
                }
            } else {
                setToolError("Unable to generate response. Please try again.");
                alert("Unable to generate response. Please try again.");
            }
        } catch (err) {
            console.error(err);
            setToolError("Unable to generate response. Please try again.");
            alert("Unable to generate response. Please try again.");
        }
        setLoadingTool("");
    };

    const handleGenerateBullet = async () => {
        setLoadingTool("bullet");
        setToolResult("");
        setToolError("");
        try {
            const res = await fetch(`${API_BASE_URL}/resume/generate-bullet/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ sentence: toolInput })
            });
            if (!res.ok) throw new Error("Request failed");
            const data = await res.json();
            if (data.bullet_point) {
                setToolResult(data.bullet_point);
            } else {
                setToolError("Unable to generate response. Please try again.");
            }
        } catch (err) {
            console.error(err);
            setToolError("Unable to generate response. Please try again.");
        }
        setLoadingTool("");
    };

    const handleSkillGap = async () => {
        setLoadingTool("gap");
        setToolError("");
        setSkillGaps([]);
        try {
            const fullText = Object.values(resumeSections).join(" ");
            const res = await fetch(`${API_BASE_URL}/resume/skill-gap/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ resume_text: fullText, target_role: toolInput || "Software Engineer" })
            });
            if (!res.ok) throw new Error("Request failed");
            const data = await res.json();
            if (data.missing_skills) {
                setSkillGaps(data.missing_skills);
            } else {
                setToolError("Unable to generate response. Please try again.");
            }
        } catch (err) {
            console.error(err);
            setToolError("Unable to generate response. Please try again.");
        }
        setLoadingTool("");
    };

    const handleCalculateATS = async () => {
        setLoadingTool("ats");
        setToolError("");
        setAtsData(null);
        try {
            const fullText = Object.values(resumeSections).join("\n\n");
            const res = await fetch(`${API_BASE_URL}/resume/ats-score/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ resume_text: fullText })
            });
            if (!res.ok) throw new Error("Request failed");
            const data = await res.json();
            if (data.score !== undefined) {
                setAtsData(data);
            } else {
                setToolError("Unable to generate response. Please try again.");
            }
        } catch (err) {
            console.error(err);
            setToolError("Unable to generate response. Please try again.");
        }
        setLoadingTool("");
    };

    // DOWNLOAD HANDLERS
    const downloadJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resumeSections, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = "resume_data.json";
        a.click();
    };

    const downloadTXT = () => {
        const contentItems = [];
        for (const [key, value] of Object.entries(resumeSections)) {
            if (key === 'personal_information') {
                const infoStr = Object.entries(value).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`).join("\n");
                contentItems.push(`PERSONAL INFORMATION\n${infoStr}`);
            } else {
                contentItems.push(`${key.toUpperCase()}\n${value}`);
            }
        }
        
        const content = contentItems.join("\n\n");
        const a = document.createElement('a');
        a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
        a.download = "Edited_Resume.txt";
        a.click();
    };

    const downloadPDF = () => {
        // Native browser print to PDF
        window.print();
    };

    const renderSectionsTab = () => (
        <div style={styles.sectionsContainer} className="no-scrollbar">
            {Object.keys(resumeSections).map((key) => {
                const isPersonalInfo = key === 'personal_information';
                
                return (
                    <div key={key} style={styles.sectionBlock}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>{key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                            {!isPersonalInfo && (
                                <div style={styles.actionBtns}>
                                    <button onClick={() => handleRewriteSection(key, "grammar")} style={styles.iconBtn} title="Fix Grammar">✅</button>
                                    <button onClick={() => handleRewriteSection(key, "concise")} style={styles.iconBtn} title="Make Concise">✂️</button>
                                    <button onClick={() => handleRewriteSection(key, "professional")} style={styles.iconBtn} className="btn-glow" title="Make Professional">✨ Rewrite</button>
                                </div>
                            )}
                        </div>
                        {loadingTool === `rewriting_${key}` && <div style={styles.smallLoader}>Working on perfection...</div>}
                        
                        {isPersonalInfo ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {Object.keys(resumeSections[key]).map((infoKey) => (
                                    <div key={infoKey}>
                                        <input
                                            type="text"
                                            style={{...styles.textarea, height: 'auto', padding: '10px'}}
                                            placeholder={infoKey.charAt(0).toUpperCase() + infoKey.slice(1)}
                                            value={resumeSections[key][infoKey]}
                                            onChange={(e) => {
                                                setResumeSections(prev => ({
                                                    ...prev,
                                                    personal_information: {
                                                        ...prev.personal_information,
                                                        [infoKey]: e.target.value
                                                    }
                                                }));
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <textarea
                                style={styles.textarea}
                                className="no-scrollbar"
                                value={resumeSections[key]}
                                onChange={(e) => handleSectionChange(key, e.target.value)}
                                rows={key === 'summary' || key === 'experience' || key === 'projects' ? 6 : 3}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );

    const renderPowerToolsTab = () => (
        <div style={styles.powerToolsContainer}>
            {/* Bullet Point Generator */}
            <div style={styles.toolCard}>
                <h3 style={styles.toolTitle}>🎯 AI Bullet Point Generator</h3>
                <p style={styles.toolDesc}>Turn a simple sentence into a powerful, metric-driven resume bullet.</p>
                <input 
                    type="text" 
                    placeholder="e.g. Built a blood donation website"
                    value={toolInput}
                    onChange={(e) => setToolInput(e.target.value)}
                    style={styles.inputField}
                />
                <button onClick={handleGenerateBullet} style={styles.primaryBtn} disabled={loadingTool === "bullet"} className="btn-glow">
                    {loadingTool === "bullet" ? "Generating..." : "Generate Professional Bullet"}
                </button>
                {toolResult && (
                    <div style={styles.toolResultBox}>
                        <strong>Suggested Bullet Point:</strong><br/><br/>
                        {toolResult}
                        <div style={{marginTop: '10px', fontSize: '13px', color: '#8b949e'}}>
                            * Copy and paste this into your Experience or Projects section.
                        </div>
                    </div>
                )}
            </div>

            {/* Skill Gap Detection */}
            <div style={styles.toolCard}>
                <h3 style={styles.toolTitle}>🔍 Skill Gap Detection</h3>
                <p style={styles.toolDesc}>Compare your current resume sections against your target role to find missing skills.</p>
                <input 
                    type="text" 
                    placeholder="Target Role (e.g. Frontend Developer)"
                    style={styles.inputField}
                    onChange={(e) => setToolInput(e.target.value)}
                />
                <button onClick={handleSkillGap} style={styles.primaryBtn} disabled={loadingTool === "gap"} className="btn-glow">
                    {loadingTool === "gap" ? "Analyzing..." : "Detect Missing Skills"}
                </button>
                
                {skillGaps.length > 0 && (
                    <div style={styles.skillGapBox}>
                        <h4 style={{marginTop: 0, color: '#fca5a5'}}>Missing Highly-Requested Skills:</h4>
                        <div style={styles.skillTags}>
                            {skillGaps.map((skill, i) => (
                                <span key={i} style={styles.missingTag}>{skill}</span>
                            ))}
                        </div>
                        <p style={{fontSize: '13px', color: '#94a3b8', marginTop: '10px'}}>
                            Consider adding these to your "Skills" section if you have experience with them, or focus on learning them to become more competitive!
                        </p>
                    </div>
                )}
            </div>

            {/* Keyword Enhancer */}
            <div style={styles.toolCard}>
                <h3 style={styles.toolTitle}>🚀 One-Click ATS Optimizer</h3>
                <p style={styles.toolDesc}>Quickly inject industry keywords to pass screening bots.</p>
                <button 
                    onClick={() => handleRewriteSection("summary", "ats")} 
                    style={{...styles.primaryBtn, background: '#10b981'}}
                    disabled={loadingTool === "rewriting_summary"}
                    className="btn-glow"
                >
                    {loadingTool === "rewriting_summary" ? "Optimizing..." : "Optimize Summary for ATS"}
                </button>
            </div>
        </div>
    );

    const renderDownloadTab = () => (
        <div style={styles.powerToolsContainer}>
            {/* ATS Score */}
            <div style={styles.toolCard}>
                <h3 style={styles.toolTitle}>📈 ATS Compatibility Score</h3>
                <p style={styles.toolDesc}>Get your document graded on structure, keywords, and parsability.</p>
                <button onClick={handleCalculateATS} style={styles.primaryBtn} disabled={loadingTool === "ats"} className="btn-glow">
                    {loadingTool === "ats" ? "Calculating..." : "Calculate Score & Get Feedback"}
                </button>
                {atsData && (
                    <div style={styles.atsResultBox}>
                        <div style={styles.atsScoreCircle}>
                            {atsData.score}/100
                        </div>
                        <div style={{flex: 1}}>
                            <h4 style={{margin: '0 0 10px 0', color: '#6ee7b7'}}>Improvement Feedback:</h4>
                            <ul style={{margin: 0, paddingLeft: '20px', color: '#e2e8f0', lineHeight: 1.5}}>
                                {atsData.suggestions?.map((s, i) => (
                                    <li key={i} style={{marginBottom: '5px'}}>{s}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Downloads */}
            <div style={styles.toolCard}>
                <h3 style={styles.toolTitle}>💾 Export Multiple Versions</h3>
                <p style={styles.toolDesc}>Download your crafted resume in various standard formats.</p>
                
                <div style={styles.downloadGrid}>
                    <button onClick={downloadPDF} style={styles.downloadBigBtn} className="glass-card-hover btn-glow">
                        📄 Print / Save as PDF
                    </button>
                    <button onClick={downloadTXT} style={styles.downloadBigBtn} className="glass-card-hover btn-glow">
                        📝 Download TXT
                    </button>
                    <button onClick={downloadJSON} style={styles.downloadBigBtn} className="glass-card-hover btn-glow">
                        ⚙️ Download JSON Data
                    </button>
                    <button onClick={downloadTXT} style={styles.downloadBigBtn} className="glass-card-hover btn-glow" title="Falls back to TXT. Use standard editors to convert to structured DOCX.">
                        📘 Download DOCX (TXT)
                    </button>
                </div>
                <p style={{fontSize: '12px', color: '#64748b', textAlign: 'center', marginTop: '15px'}}>
                    * For best PDF results, use 'Save to PDF' in the print dialog that opens.
                </p>
            </div>
        </div>
    );

    return (
        <div style={styles.page} className="print-mode-wrapper bg-animate">
            {/* Hide Navigation exactly when printing */}
            <div className="no-print">
                <Navbar />
                <AIParticles />
            </div>

            <div style={styles.container}>
                <div style={styles.header} className="no-print">
                    <h1 style={styles.title}>AI Resume Editor <span style={styles.badgeSparkle}>✍️</span></h1>
                    <p style={styles.subtitle}>Intelligent sectional editing, grammar fixing, and ATS optimization</p>
                </div>

                <div style={styles.layout}>
                    
                    {/* Left Panel: Sections Editor */}
                    <div style={styles.leftPanel}>
                        <div style={styles.panelHeader} className="no-print">
                            <h3 style={styles.panelTitle}>Document Editor</h3>
                        </div>
                        
                        {/* THE PRINTABLE RESUME CONTENT GOES HERE EXACTLY AS THEY POPULATED IT */}
                        <div className="print-only" style={{display: 'none', color: 'black', background: 'white', padding: '20px'}}>
                            {Object.keys(resumeSections).map(key => (
                                <div key={key} style={{marginBottom: '15px'}}>
                                    <h4 style={{textTransform: 'uppercase', borderBottom: '1px solid #ccc', margin: '0 0 5px', color: '#333'}}>{key.replace('_', ' ')}</h4>
                                    <pre style={{whiteSpace: 'pre-wrap', fontStyle: 'inherit', fontFamily: 'inherit', margin: 0, color: '#000'}}>
                                        {key === 'personal_information' 
                                            ? Object.entries(resumeSections[key]).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`).join('\n')
                                            : resumeSections[key]}
                                    </pre>
                                </div>
                            ))}
                        </div>

                        <div className="no-print" style={{height: '100%'}}>
                            {loadingTool === "parsing" ? (
                                <div style={{padding: '50px', textAlign: 'center', color: '#a87ffb', fontStyle: 'italic'}}>
                                    Analyzing and extracting your resume sections via AI...
                                </div>
                            ) : (
                                renderSectionsTab()
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Tools & Features */}
                    <div style={{...styles.rightPanel, display: 'flex', flexDirection: 'column'}} className="no-print">
                        <div style={styles.tabHeader}>
                            <button 
                                onClick={() => setActiveTab("power")} 
                                style={activeTab === "power" ? styles.tabBtnActive : styles.tabBtn}
                            >
                                ⚡ Power Tools
                            </button>
                            <button 
                                onClick={() => setActiveTab("download")} 
                                style={activeTab === "download" ? styles.tabBtnActive : styles.tabBtn}
                            >
                                📈 ATS & Export
                            </button>
                        </div>
                        
                        {toolError && (
                            <div style={{...styles.skillGapBox, background: 'rgba(239, 68, 68, 0.1)', borderLeftColor: '#ef4444', margin: '15px 25px 0 25px', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ef4444'}}>
                                <strong style={{color: '#f87171'}}>{toolError}</strong>
                            </div>
                        )}
                        
                        <div style={styles.tabContent} className="no-scrollbar">
                            {activeTab === "power" && renderPowerToolsTab()}
                            {activeTab === "download" && renderDownloadTab()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Critical print styles to make the browser dialog clean */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    .print-mode-wrapper { 
                        background: none !important; 
                        padding: 0 !important;
                        color: black !important;
                    }
                    body {
                        background: white;
                    }
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
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
        maxWidth: "1400px",
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
    layout: {
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        gap: "30px",
        alignItems: "start",
    },
    leftPanel: {
        background: "rgba(30, 41, 59, 0.4)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "24px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        height: "85vh",
        overflow: "hidden",
    },
    rightPanel: {
        background: "rgba(30, 41, 59, 0.2)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "24px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        height: "85vh",
        overflow: "hidden",
    },
    panelHeader: {
        padding: "20px 25px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(0,0,0,0.2)",
    },
    panelTitle: {
        margin: 0,
        fontSize: "18px",
        fontWeight: "600",
    },
    sectionsContainer: {
        padding: "20px 25px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "25px",
        height: "calc(100% - 65px)", // subtract header approx
    },
    sectionBlock: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    sectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    sectionTitle: {
        margin: 0,
        fontSize: "15px",
        color: "#a87ffb",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "1px",
    },
    actionBtns: {
        display: "flex",
        gap: "8px",
    },
    iconBtn: {
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#e2e8f0",
        padding: "6px 10px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "13px",
        transition: "all 0.2s",
    },
    textarea: {
        width: "100%",
        padding: "15px",
        borderRadius: "12px",
        background: "rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "#e2e8f0",
        fontSize: "14px",
        lineHeight: "1.6",
        resize: "vertical",
        outline: "none",
        fontFamily: "'Inter', sans-serif",
    },
    smallLoader: {
        fontSize: "12px",
        color: "#34d399",
        fontStyle: "italic"
    },
    tabHeader: {
        display: "flex",
        background: "rgba(0,0,0,0.3)",
        padding: "0",
    },
    tabBtn: {
        flex: 1,
        padding: "15px",
        background: "transparent",
        color: "#94a3b8",
        border: "none",
        borderBottom: "2px solid transparent",
        cursor: "pointer",
        fontWeight: "600",
        transition: "all 0.2s",
    },
    tabBtnActive: {
        flex: 1,
        padding: "15px",
        background: "rgba(255, 255, 255, 0.05)",
        color: "#fff",
        border: "none",
        borderBottom: "2px solid #a87ffb",
        cursor: "pointer",
        fontWeight: "700",
    },
    tabContent: {
        flex: 1,
        padding: "25px",
        overflowY: "auto",
        height: "calc(100% - 50px)"
    },
    powerToolsContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "25px",
    },
    toolCard: {
        background: "rgba(0, 0, 0, 0.2)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "20px",
        borderRadius: "16px",
    },
    toolTitle: {
        margin: "0 0 10px 0",
        fontSize: "18px",
        color: "#f8fafc",
    },
    toolDesc: {
        fontSize: "14px",
        color: "#94a3b8",
        margin: "0 0 15px 0",
        lineHeight: "1.5",
    },
    inputField: {
        width: "100%",
        padding: "12px 15px",
        borderRadius: "8px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#fff",
        fontSize: "14px",
        marginBottom: "15px",
        outline: "none"
    },
    primaryBtn: {
        padding: "12px 20px",
        background: "linear-gradient(to right, #3b82f6, #6366f1)",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        fontWeight: "600",
        cursor: "pointer",
        width: "100%",
        transition: "all 0.3s ease",
        opacity: 0.9,
    },
    toolResultBox: {
        marginTop: "15px",
        padding: "15px",
        background: "rgba(16, 185, 129, 0.1)",
        borderLeft: "4px solid #34d399",
        borderRadius: "8px",
        fontSize: "14px",
        color: "#e2e8f0",
        lineHeight: "1.6",
    },
    skillGapBox: {
        marginTop: "15px",
        padding: "15px",
        background: "rgba(255, 0, 0, 0.05)",
        borderLeft: "4px solid #fca5a5",
        borderRadius: "8px",
    },
    skillTags: {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
    },
    missingTag: {
        background: "rgba(252, 165, 165, 0.15)",
        color: "#fca5a5",
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: "500",
    },
    atsResultBox: {
        marginTop: "15px",
        padding: "20px",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        gap: "20px",
    },
    atsScoreCircle: {
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(168,127,251,0.2) 0%, rgba(16,185,129,0.1) 100%)",
        border: "4px solid #a87ffb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
        fontWeight: "800",
        color: "#fff",
        boxShadow: "0 0 15px rgba(168,127,251,0.3)"
    },
    downloadGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "15px",
    },
    downloadBigBtn: {
        padding: "15px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#e2e8f0",
        borderRadius: "12px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
    }
};

export default ResumeEditor;
