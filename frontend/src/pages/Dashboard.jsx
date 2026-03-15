import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AIParticles from "../components/AIParticles";
import Navbar from "../components/Navbar";

function Dashboard() {
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();


  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setIsAnalyzing(false);
  };

  const handleUpload = async () => {
    console.log("Button clicked");

    if (!file) {
      alert("Please select a file");
      return;
    }

    const token = localStorage.getItem("token");
    console.log("Token:", token);

    if (!token) {
      alert("Please login first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsAnalyzing(true);
      console.log("Sending request...");

      const response = await fetch("http://127.0.0.1:8000/upload/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setIsAnalyzing(false);
        if (response.status === 401) {
          localStorage.removeItem("token");
          alert("Your session has expired. Please login again to continue.");
          window.location.href = "/login";
          return;
        }
        alert(data.detail || "Upload failed");
        return;
      }

      // Delay navigation slightly for visual appeal of the loader
      setTimeout(() => {
        navigate("/results", { state: { data: data } });
      }, 1500);

    } catch (error) {
      console.error("Upload error:", error);
      setIsAnalyzing(false);
      alert("Something went wrong");
    }
  };


  return (
    <div style={styles.page} className="bg-animate">
      <Navbar />
      <AIParticles />
      {/* Decorative Blob */}
      <div className="animated-blob" style={styles.blob1}></div>
      <div className="animated-blob" style={{ ...styles.blob2, animationDelay: '-7.5s' }}></div>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title} className="typing-effect">AI Resume Engine <span style={styles.badgeSparkle}>✨</span></h1>
          <p style={styles.subtitle}>Unlock your career potential with intelligent insights</p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              className="btn-glow"
              style={styles.historyShortcut}
              onClick={() => navigate("/upload-history")}
            >
              View My History
            </button>
            <button
              className="btn-glow"
              style={{ ...styles.historyShortcut, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}
              onClick={() => navigate("/jobs")}
            >
              Job Center 🚀
            </button>
          </div>
        </div>

        {/* Upload Section */}
        <div style={styles.glassCard} className="glass-card-hover">
          <div style={styles.uploadArea}>
            <input
              type="file"
              onChange={handleFileChange}
              style={styles.fileInput}
              id="resume-upload"
            />
            <label htmlFor="resume-upload" style={styles.customFileLabel}>
              {file ? file.name : "Select your Resume (PDF/DOCX)"}
            </label>
            <button className={file ? "btn-glow" : ""} style={file ? styles.uploadBtnActive : styles.uploadBtn} onClick={handleUpload} disabled={isAnalyzing}>
              {isAnalyzing ? "Analyzing Core Metrics..." : "Analyze Resume"}
            </button>
          </div>
        </div>

        {/* Dynamic Loading UI */}
        {isAnalyzing && (
          <div style={styles.loadingWrapper}>
            <div style={styles.scannerLine}></div>
            <div style={styles.loadingCard}>
              <div style={styles.spinner}></div>
              <h3 style={styles.loadingText}>Running AI Models</h3>
              <p style={styles.loadingSubText}>Deep-scanning formatting, keywords, and industry alignment...</p>
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
    padding: "80px 20px",
    position: "relative",
    overflow: "hidden",
    color: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: "15px",
  },
  historyShortcut: {
    background: "rgba(168, 127, 251, 0.1)",
    border: "1px solid rgba(168, 127, 251, 0.3)",
    color: "#a87ffb",
    padding: "8px 20px",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s ease",
  },
  glassCard: {
    background: "rgba(30, 41, 59, 0.4)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    padding: "35px",
    borderRadius: "24px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    textAlign: "center",
    marginBottom: "40px",
  },
  uploadArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
  },
  fileInput: {
    display: "none",
  },
  customFileLabel: {
    padding: "16px 30px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "2px dashed rgba(168, 127, 251, 0.4)",
    borderRadius: "12px",
    color: "#c9d1d9",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "500",
    transition: "all 0.3s ease",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center",
  },
  uploadBtn: {
    padding: "14px 35px",
    borderRadius: "30px",
    border: "none",
    background: "rgba(255, 255, 255, 0.1)",
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "not-allowed",
    transition: "all 0.3s ease",
  },
  uploadBtnActive: {
    padding: "14px 35px",
    borderRadius: "30px",
    border: "none",
    background: "linear-gradient(135deg, #a87ffb, #58a6ff)",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 8px 16px rgba(168, 127, 251, 0.3)",
    transition: "all 0.3s ease",
    transform: "translateY(-2px)",
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
  jobContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "10px",
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
  neonIcon: {
    fontSize: "18px",
    marginLeft: "5px",
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
  },
  downloadBtn: {
    padding: "16px 40px",
    borderRadius: "30px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(22, 27, 34, 0.8)",
    color: "#ffffff",
    fontWeight: "600",
    fontSize: "16px",
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    transition: "all 0.3s ease",
    display: "inline-flex",
    alignItems: "center",
  },
  loadingWrapper: {
    position: "relative",
    marginTop: "40px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
    animation: "fadeInUp 0.6s ease-out forwards",
  },
  scannerLine: {
    position: "absolute",
    width: "100%",
    height: "2px",
    background: "linear-gradient(90deg, transparent, #3b82f6, transparent)",
    top: 0,
    animation: "scan 2s ease-in-out infinite alternate",
    boxShadow: "0 0 15px #3b82f6",
  },
  loadingCard: {
    background: "rgba(30, 41, 59, 0.4)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    padding: "40px 60px",
    borderRadius: "24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "0 10px 40px rgba(59, 130, 246, 0.15)",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid rgba(59, 130, 246, 0.2)",
    borderTop: "4px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },
  loadingText: {
    color: "#f8fafc",
    fontSize: "22px",
    fontWeight: "600",
    margin: "0 0 10px 0",
  },
  loadingSubText: {
    color: "#94a3b8",
    fontSize: "14px",
    margin: 0,
    textAlign: "center",
  }
};

// Insert basic keyframes into DOM if they don't exist
const injectStyles = () => {
  if (typeof window !== "undefined") {
    const styleId = "dashboard-animations";
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.innerHTML = `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap');
          @keyframes fadeInUp {
            from {opacity: 0; transform: translateY(20px); }
            to {opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% {transform: scale(1.1); opacity: 0.8; }
            100% {transform: scale(1); opacity: 1; }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes scan {
            0% { transform: translateY(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(180px); opacity: 0; }
          }
          .hover-lift:hover {
            transform: translateY(-2px);
            background: rgba(168, 127, 251, 0.2) !important;
          }
          `;
      document.head.appendChild(styleEl);
    }
  }
};
injectStyles();

export default Dashboard;
