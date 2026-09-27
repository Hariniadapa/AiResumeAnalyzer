import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { API_BASE_URL } from "../config/api";

function JobCenter() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const loadRecommendations = async () => {
      setLoading(true);
      setError(null);
      try {
        const resumeText = localStorage.getItem("resume_text") || "";
        const res = await fetch(`${API_BASE_URL}/jobs/recommend/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ resume_text: resumeText }),
          signal: controller.signal,
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          if (isMounted) navigate("/login");
          return;
        }

        if (!res.ok) {
          throw new Error(`Server status ${res.status}`);
        }

        const data = await res.json();
        const jobList = Array.isArray(data) ? data : [];

        if (isMounted) {
          setJobs(jobList);

          if (!resumeText && jobList.length === 0) {
            try {
              const histRes = await fetch(`${API_BASE_URL}/upload-history/`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
              });
              if (histRes.ok) {
                const hist = await histRes.json();
                setHasResume(Array.isArray(hist) && hist.length > 0);
              } else {
                setHasResume(false);
              }
            } catch {
              setHasResume(false);
            }
          } else {
            setHasResume(true);
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error loading job recommendations:", err);
        }
        if (isMounted) {
          setError("Unable to load job recommendations. Please try again.");
          setJobs([]);
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRecommendations();

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [token, navigate]);

  const getValidUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://"))
      return null;
    if (
      trimmed === "https://www.linkedin.com/jobs" ||
      trimmed === "https://linkedin.com/jobs" ||
      trimmed === "https://www.linkedin.com/jobs/" ||
      trimmed === "https://linkedin.com/jobs/"
    )
      return null;
    return trimmed;
  };

  const thStyle = {
    padding: "16px 20px",
    fontWeight: "700",
    color: "#cbd5e1",
    fontSize: "13px",
    letterSpacing: "0.3px",
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0b1220",
        backgroundImage: "radial-gradient(circle at top, #142138, #0b1220 80%)",
        fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "110px 24px 60px",
        color: "#f8fafc",
      }}
    >
      <Navbar />

      <div style={{ maxWidth: "1150px", margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "30px",
            fontWeight: "800",
            color: "#ffffff",
            margin: "0 0 6px 0",
            letterSpacing: "-0.5px",
          }}
        >
          Job Center
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "#94a3b8",
            margin: "0 0 24px 0",
            lineHeight: "1.5",
          }}
        >
          Jobs and internships matched to your resume.
        </p>

        {loading ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              background: "rgba(20, 33, 56, 0.4)",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#94a3b8",
              fontSize: "15px",
            }}
          >
            Loading recommendations...
          </div>
        ) : error ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              background: "rgba(20, 33, 56, 0.4)",
              borderRadius: "10px",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#fca5a5",
              fontSize: "15px",
            }}
          >
            {error}
          </div>
        ) : !hasResume ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              background: "rgba(20, 33, 56, 0.4)",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#94a3b8",
              fontSize: "15px",
            }}
          >
            Upload your resume to get personalized job recommendations.
          </div>
        ) : jobs.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              background: "rgba(20, 33, 56, 0.4)",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#94a3b8",
              fontSize: "15px",
            }}
          >
            No matching jobs found.
          </div>
        ) : (
          <div
            style={{
              borderRadius: "10px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.4)",
              background: "#0c1424",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#162238",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Match</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, idx) => {
                  const matchVal = job.match_score ?? job.match_percent ?? 0;
                  const matchFormatted =
                    typeof matchVal === "number" && !Number.isInteger(matchVal)
                      ? `${matchVal.toFixed(1)}%`
                      : `${matchVal}%`;

                  const isIntern = (job.job_type || "")
                    .toLowerCase()
                    .includes("intern");
                  const validUrl = getValidUrl(
                    job.job_link || job.job_url
                  );

                  return (
                    <tr
                      key={job.id || idx}
                      style={{
                        background:
                          idx % 2 === 0
                            ? "#0c1322"
                            : "#11192b",
                        borderBottom:
                          "1px solid rgba(255, 255, 255, 0.05)",
                        transition: "background 0.2s ease",
                      }}
                    >
                      {/* Role */}
                      <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                        <div
                          style={{
                            fontWeight: "600",
                            color: "#f8fafc",
                            fontSize: "14px",
                            marginBottom: "6px",
                            lineHeight: "1.4",
                          }}
                        >
                          {job.job_role_title ||
                            job.job_title ||
                            "Untitled Role"}
                        </div>
                        {validUrl && (
                          <a
                            href={validUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#58a6ff",
                              fontSize: "12px",
                              textDecoration: "underline",
                              display: "inline-block",
                            }}
                          >
                            Apply / View Job
                          </a>
                        )}
                      </td>

                      {/* Company */}
                      <td
                        style={{
                          padding: "16px 20px",
                          color: "#cbd5e1",
                          fontWeight: "500",
                          verticalAlign: "top",
                        }}
                      >
                        {job.company_name || "—"}
                      </td>

                      {/* Location */}
                      <td
                        style={{
                          padding: "16px 20px",
                          color: "#cbd5e1",
                          verticalAlign: "top",
                        }}
                      >
                        {job.job_location || "—"}
                      </td>

                      {/* Match */}
                      <td
                        style={{
                          padding: "16px 20px",
                          fontWeight: "600",
                          color: "#e2e8f0",
                          verticalAlign: "top",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {matchFormatted}
                      </td>

                      {/* Type */}
                      <td
                        style={{
                          padding: "16px 20px",
                          color: "#cbd5e1",
                          verticalAlign: "top",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isIntern ? "Internship" : "Job"}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                        {validUrl ? (
                          <a
                            href={validUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#58a6ff",
                              fontSize: "13px",
                              fontWeight: "600",
                              textDecoration: "none",
                            }}
                          >
                            Apply / View Job
                          </a>
                        ) : (
                          <span
                            style={{
                              color: "#64748b",
                              fontSize: "13px",
                            }}
                          >
                            Apply / View Job
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default JobCenter;
