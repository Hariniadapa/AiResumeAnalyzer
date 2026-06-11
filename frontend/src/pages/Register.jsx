import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AIParticles from "../components/AIParticles";
import Navbar from "../components/Navbar";
import { API_BASE_URL } from "../config/api";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    const response = await fetch(`${API_BASE_URL}/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert("Registered successfully! Please login.");
      navigate("/");
    } else {
      alert(data.detail || "Registration failed");
    }
  };

  return (
    <div style={styles.page} className="bg-animate">
      <Navbar />
      <AIParticles />
      <div className="animated-blob" style={styles.blob1}></div>
      <div className="animated-blob" style={styles.blob2}></div>
      <div style={styles.card} className="glass-card-hover">
        <h2 style={styles.title} className="typing-effect">Register</h2>

        <form onSubmit={handleRegister} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" style={styles.button}>
            Register
          </button>
        </form>

        <p style={{ marginTop: "20px", color: "#8b949e", fontSize: "14px", fontFamily: "'Inter', sans-serif" }}>
          Already have an account?{" "}
          <span
            style={{ color: "#a87ffb", cursor: "pointer", fontWeight: "600" }}
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    backgroundImage: "radial-gradient(circle at top, #1e293b, #0f172a 80%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "80px 20px 20px",
    boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif",
    position: "relative",
    overflow: "hidden",
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
    bottom: "-150px",
    right: "-150px",
    width: "400px",
    height: "400px",
    background: "rgba(88, 166, 255, 0.1)",
    filter: "blur(80px)",
    borderRadius: "50%",
    zIndex: 0,
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    padding: "45px 35px",
    borderRadius: "24px",
    background: "rgba(30, 41, 59, 0.4)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    textAlign: "center",
    boxSizing: "border-box",
    position: "relative",
    zIndex: 10,
  },
  title: {
    marginBottom: "30px",
    color: "#ffffff",
    fontSize: "32px",
    fontWeight: "800",
    letterSpacing: "-1px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "16px 20px",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    fontSize: "15px",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    color: "#ffffff",
    outline: "none",
    transition: "all 0.3s ease",
    margin: "0",
  },
  button: {
    width: "100%",
    boxSizing: "border-box",
    padding: "16px",
    borderRadius: "30px",
    border: "none",
    background: "linear-gradient(135deg, #a87ffb, #58a6ff)",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    marginTop: "10px",
    boxShadow: "0 8px 16px rgba(168, 127, 251, 0.3)",
  },
};

export default Register;
