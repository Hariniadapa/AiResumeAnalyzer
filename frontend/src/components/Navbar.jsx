import { useNavigate } from "react-router-dom";

const Navbar = () => {
    const navigate = useNavigate();

    return (
        <nav style={styles.navbar}>
            <div style={styles.container}>
                <div style={styles.logo} onClick={() => navigate("/")}>
                    ResumeAI Pro
                </div>
                <div style={styles.navLinks}>
                    <button style={styles.navBtn} onClick={() => navigate("/dashboard")}>
                        Dashboard
                    </button>
                    <button style={styles.navBtn} onClick={() => navigate("/jobs")}>
                        Job Center
                    </button>
                    <button style={styles.navBtn} onClick={() => navigate("/interview")}>
                        Interview Prep
                    </button>
                    <button style={styles.navBtn} onClick={() => navigate("/chat")}>
                        AI Mentor
                    </button>
                    <button style={styles.loginBtn} onClick={() => navigate("/login")}>
                        Login
                    </button>
                    <button style={styles.registerBtn} onClick={() => navigate("/register")}>
                        Register
                    </button>
                </div>
            </div>
        </nav>
    );
};

const styles = {
    navbar: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 1000,
        background: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        height: "80px",
        display: "flex",
        alignItems: "center",
    },
    container: {
        maxWidth: "1200px",
        width: "100%",
        margin: "0 auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
    },
    logo: {
        fontSize: "24px",
        fontWeight: "800",
        color: "#ffffff",
        cursor: "pointer",
        letterSpacing: "-0.5px",
        background: "linear-gradient(135deg, #ffffff 0%, #a87ffb 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
    },
    navLinks: {
        display: "flex",
        gap: "15px",
    },
    navBtn: {
        background: "transparent",
        border: "none",
        color: "#94a3b8",
        fontSize: "15px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "color 0.2s ease",
        padding: "10px",
    },
    loginBtn: {
        padding: "10px 24px",
        borderRadius: "12px",
        border: "1px solid rgba(168, 127, 251, 0.5)",
        background: "transparent",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.3s ease",
    },
    registerBtn: {
        padding: "10px 24px",
        borderRadius: "12px",
        border: "none",
        background: "linear-gradient(135deg, #a87ffb 0%, #58a6ff 100%)",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "600",
        cursor: "pointer",
        boxShadow: "0 4px 15px rgba(168, 127, 251, 0.3)",
        transition: "all 0.3s ease",
    },
};

export default Navbar;
