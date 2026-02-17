import { useState, useEffect } from "react";

function Dashboard() {
  const [file, setFile] = useState(null);
  const [atsScore, setAtsScore] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [jobRecommendations, setJobRecommendations] = useState([]);
  const [summary, setSummary] = useState("");
  const [reportFile, setReportFile] = useState("");

  const token = localStorage.getItem("token");

  // Smooth ATS animation
  useEffect(() => {
    if (atsScore === 0) return;

    let start = 0;
    const interval = setInterval(() => {
      start += 1;
      setAnimatedScore(start);
      if (start >= atsScore) clearInterval(interval);
    }, 20);

    return () => clearInterval(interval);
  }, [atsScore]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setAtsScore(0);
    setAnimatedScore(0);
    setJobRecommendations([]);
    setSummary("");
    setReportFile("");
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
    console.log("Sending request...");

    const response = await fetch("http://127.0.0.1:8000/upload/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    console.log("Response received:", response);

    const data = await response.json();
    console.log("Backend data:", data);

    if (!response.ok) {
      alert(data.detail || "Upload failed");
      return;
    }

    setAtsScore(data.ats_score || 0);
    setJobRecommendations(data.job_recommendations || []);
    setSummary(data.summary || "");
    setReportFile(data.report_filename || "");

  } catch (error) {
    console.error("Upload error:", error);
    alert("Something went wrong");
  }
};


  const handleDownload = () => {
    fetch(`http://127.0.0.1:8000/download-report/${reportFile}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = reportFile;
        a.click();
      });
  };

  const circleDegree = animatedScore * 3.6;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>AI Resume Analyzer</h1>

        {/* Upload Section */}
        <div style={styles.card}>
          <input type="file" onChange={handleFileChange} />
          <button style={styles.uploadBtn} onClick={handleUpload}>
            Analyze Resume
          </button>
        </div>

        {/* Results */}
        {atsScore > 0 && (
          <div style={styles.resultsWrapper}>
            
            {/* ATS Score */}
            <div style={styles.scoreCard}>
              <div
                style={{
                  ...styles.circle,
                  background: `conic-gradient(#6c63ff ${circleDegree}deg, #e6e6e6 0deg)`
                }}
              >
                <div style={styles.innerCircle}>
                  {animatedScore}%
                  <span style={styles.scoreLabel}>ATS Score</span>
                </div>
              </div>
            </div>

  {/* Resume Summary */}
       <div style={styles.summaryCard}>
         <div style={styles.summaryHeader}>
            <h3 style={{ margin: 0 }}>Uploaded Resume Summary</h3>
            <span style={styles.aiBadge}>AI Generated</span>
        </div>

           <p style={styles.summaryText}>
           {summary}
            </p>
          </div>

            {/* Job Recommendations */}
            <div style={styles.infoCard}>
              <h3>Recommended Roles</h3>
              <div style={styles.jobContainer}>
                {jobRecommendations.map((job, idx) => (
                  <span key={idx} style={styles.jobTag}>
                    {job}
                  </span>
                ))}
              </div>
            </div>
            {/* Download Report */}
        <div style={{ textAlign: "center" }}>
            <button style={styles.downloadBtn} onClick={handleDownload}>
            ⬇ Download Report
            </button>
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
    backgroundColor: "#f3f6ff",
    padding: "40px",
  },
  container: {
    maxWidth: "900px",
    margin: "auto",
  },
  title: {
    textAlign: "center",
    marginBottom: "30px",
  },
  card: {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  uploadBtn: {
    marginTop: "15px",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#6c63ff",
    color: "white",
    cursor: "pointer",
  },
  resultsWrapper: {
    marginTop: "30px",
    display: "flex",
    flexDirection: "column",
    gap: "25px",
  },
  scoreCard: {
    display: "flex",
    justifyContent: "center",
  },
  circle: {
    width: "170px",
    height: "170px",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    transition: "1s ease",
  },
  innerCircle: {
    width: "130px",
    height: "130px",
    borderRadius: "50%",
    backgroundColor: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "22px",
    fontWeight: "bold",
  },
  scoreLabel: {
    fontSize: "12px",
    fontWeight: "normal",
  },
  infoCard: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
  },
  jobContainer: {
    marginTop: "10px",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  jobTag: {
    backgroundColor: "#e8e7ff",
    padding: "8px 12px",
    borderRadius: "20px",
    fontSize: "14px",
  },
  summaryCard: {
  backgroundColor: "white",
  padding: "22px",
  borderRadius: "14px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  borderLeft: "5px solid #6c63ff",
},

summaryHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
},

aiBadge: {
  backgroundColor: "#f0f0ff",
  color: "#6c63ff",
  fontSize: "12px",
  padding: "4px 10px",
  borderRadius: "20px",
  fontWeight: "500",
},

summaryText: {
  fontSize: "16px",
  lineHeight: "1.7",
  color: "#444"
},


downloadBtn: {
  padding: "8px 18px",
  borderRadius: "25px",
  border: "none",
  background: "linear-gradient(90deg, #6c63ff, #5a52d6)",
  color: "white",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(108,99,255,0.3)",
  transition: "0.3s",
},
};

export default Dashboard;
