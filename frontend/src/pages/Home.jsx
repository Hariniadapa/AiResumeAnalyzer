import { useNavigate } from "react-router-dom";
import AIParticles from "../components/AIParticles";
import Navbar from "../components/Navbar";
import { useState } from "react";
import heroImg from "../assets/hero.png";

const Home = () => {
    const navigate = useNavigate();

    return (
        <div style={styles.page} className="bg-animate">
            <Navbar />
            <AIParticles />

            {/* Decorative Blobs */}
            <div className="animated-blob" style={styles.blob1}></div>
            <div className="animated-blob" style={styles.blob2}></div>

            {/* Hero Section */}
            <section style={styles.hero}>
                <div style={styles.heroContent}>
                    <div style={styles.heroLeft}>
                        <h1 style={styles.heroTitle} className="typing-effect">
                            Build a Smarter <br /> Resume with AI
                        </h1>
                        <p style={styles.heroSubtitle}>
                            Unlock your career potential with instant resume scoring,
                            deep skill analysis, and personalized career suggestions
                            powered by advanced artificial intelligence.
                        </p>
                        <div style={styles.heroButtons}>
                            <button
                                style={styles.mainBtn}
                                className="btn-glow"
                                onClick={() => navigate("/login")}
                            >
                                Analyze My Resume
                            </button>
                            <button
                                style={styles.outlineBtn}
                                className="glass-card-hover"
                                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                            >
                                Explore Features
                            </button>
                        </div>
                    </div>
                    <div style={styles.heroRight}>
                        <div style={styles.imageWrapper}>
                            <img src={heroImg} alt="AI Dashboard" style={styles.heroImage} />
                            <div style={styles.imageOverlay}></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" style={styles.featuresSection}>
                <h2 style={styles.sectionTitle}>Powerful Features of Our Platform</h2>
                <div style={styles.featuresGrid}>
                    {features.map((f, i) => (
                        <div key={i} style={styles.featureCard} className="glass-card-hover">
                            <div style={styles.featureIcon}>{f.icon}</div>
                            <h3 style={styles.featureTitle}>{f.title}</h3>
                            <p style={styles.featureDesc}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ Section */}
            <section style={styles.faqSection}>
                <h2 style={styles.sectionTitle}>Common Questions</h2>
                <div style={styles.faqContainer}>
                    {faqs.map((faq, i) => (
                        <FAQItem key={i} question={faq.q} answer={faq.a} />
                    ))}
                </div>
            </section>

            {/* Closing Section */}
            <section style={styles.closingSection}>
                <div style={styles.ctaCard} className="glass-card-hover">
                    <h2 style={styles.ctaTitle}>Start Your Career Journey Today</h2>
                    <p style={styles.ctaSubtitle}>
                        Join thousands of professionals who improved their hireability with ResumeAI Pro.
                    </p>
                    <button
                        style={styles.ctaButton}
                        className="btn-glow"
                        onClick={() => navigate("/register")}
                    >
                        Get Started Now
                    </button>
                </div>
            </section>

            <footer style={styles.footer}>
                <p>&copy; 2026 ResumeAI Pro. All rights reserved.</p>
            </footer>
        </div>
    );
};

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={styles.faqItem} onClick={() => setIsOpen(!isOpen)}>
            <div style={styles.faqQuestion}>
                {question}
                <span style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "0.3s" }}>
                    ▼
                </span>
            </div>
            {isOpen && <div style={styles.faqAnswer}>{answer}</div>}
        </div>
    );
};

const features = [
    {
        title: "Resume Content Extraction",
        desc: "Automatically parse complex PDF and Word documents with human-like precision to identify core data points.",
        icon: "📄",
    },
    {
        title: "Intelligent Resume Insights",
        desc: "Get deep analysis on your formatting, grammar, and sentence structure with actionable feedback.",
        icon: "💡",
    },
    {
        title: "Smart Skill Matching System",
        desc: "Discover how well your skills align with industry standards and identify specific keywords you're missing.",
        icon: "🎯",
    },
    {
        title: "Career Recommendation Engine",
        desc: "Receive personalized job role suggestions based on your unique experience profile and skill set.",
        icon: "🚀",
    },
];

const faqs = [
    {
        q: "How does the AI evaluate my resume?",
        a: "Our AI uses Natural Language Processing (NLP) models to scan your resume text against thousands of job descriptions and industry benchmarks to provide an accurate ATS score.",
    },
    {
        q: "Is my personal information kept private?",
        a: "Yes. We use industry-standard encryption and your data is only used for analysis. We never share your personal details with third parties without your consent.",
    },
    {
        q: "Can I track my resume improvement over time?",
        a: "Absolutely. Your dashboard maintains a full history of your uploads, allowing you to see how your score improves as you make adjustments.",
    },
    {
        q: "Does the platform suggest suitable job roles?",
        a: "Yes! Based on your skill matching and experience, our engine identifies specific career paths and job titles where you have the highest probability of success.",
    },
];

const styles = {
    page: {
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        backgroundImage: "radial-gradient(circle at top, #1e293b, #0f172a 80%)",
        color: "#ffffff",
        paddingTop: "80px",
        overflowX: "hidden",
    },
    blob1: {
        position: "absolute",
        top: "10%",
        left: "-10%",
        width: "40vw",
        height: "40vw",
        background: "rgba(168, 127, 251, 0.1)",
        filter: "blur(120px)",
        borderRadius: "50%",
        zIndex: 0,
    },
    blob2: {
        position: "absolute",
        bottom: "10%",
        right: "-10%",
        width: "35vw",
        height: "35vw",
        background: "rgba(88, 166, 255, 0.08)",
        filter: "blur(120px)",
        borderRadius: "50%",
        zIndex: 0,
    },
    hero: {
        minHeight: "90vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 20px",
        position: "relative",
        zIndex: 1,
    },
    heroContent: {
        maxWidth: "1200px",
        width: "100%",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "40px",
    },
    heroLeft: {
        flex: "1",
        minWidth: "320px",
    },
    heroTitle: {
        fontSize: "clamp(42px, 6vw, 68px)",
        fontWeight: "800",
        lineHeight: "1.1",
        marginBottom: "24px",
        letterSpacing: "-1.5px",
    },
    heroSubtitle: {
        fontSize: "clamp(18px, 2vw, 20px)",
        color: "#94a3b8",
        lineHeight: "1.6",
        marginBottom: "40px",
        maxWidth: "500px",
    },
    heroButtons: {
        display: "flex",
        gap: "20px",
        flexWrap: "wrap",
    },
    mainBtn: {
        padding: "16px 32px",
        borderRadius: "30px",
        background: "linear-gradient(135deg, #a87ffb 0%, #58a6ff 100%)",
        color: "#ffffff",
        fontSize: "16px",
        fontWeight: "600",
        border: "none",
        cursor: "pointer",
        boxShadow: "0 10px 25px rgba(168, 127, 251, 0.4)",
    },
    outlineBtn: {
        padding: "16px 32px",
        borderRadius: "30px",
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "#ffffff",
        fontSize: "16px",
        fontWeight: "600",
        cursor: "pointer",
        backdropFilter: "blur(10px)",
    },
    heroRight: {
        flex: "1",
        minWidth: "320px",
        display: "flex",
        justifyContent: "center",
    },
    imageWrapper: {
        position: "relative",
        width: "100%",
        maxWidth: "600px",
        borderRadius: "24px",
        overflow: "hidden",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(168, 127, 251, 0.2)",
    },
    heroImage: {
        width: "100%",
        display: "block",
        transition: "transform 0.5s ease",
    },
    imageOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "linear-gradient(to top, rgba(15, 23, 42, 0.4), transparent)",
        pointerEvents: "none",
    },
    featuresSection: {
        padding: "100px 20px",
        maxWidth: "1200px",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
    },
    sectionTitle: {
        fontSize: "clamp(32px, 4vw, 42px)",
        fontWeight: "800",
        textAlign: "center",
        marginBottom: "60px",
        letterSpacing: "-1px",
    },
    featuresGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "30px",
    },
    featureCard: {
        background: "rgba(30, 41, 59, 0.4)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "40px",
        borderRadius: "24px",
        textAlign: "left",
    },
    featureIcon: {
        fontSize: "40px",
        marginBottom: "20px",
    },
    featureTitle: {
        fontSize: "22px",
        fontWeight: "700",
        marginBottom: "16px",
    },
    featureDesc: {
        fontSize: "15px",
        color: "#94a3b8",
        lineHeight: "1.6",
    },
    faqSection: {
        padding: "100px 20px",
        maxWidth: "800px",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
    },
    faqContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    faqItem: {
        background: "rgba(30, 41, 59, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "16px",
        overflow: "hidden",
        cursor: "pointer",
    },
    faqQuestion: {
        padding: "20px 24px",
        fontSize: "17px",
        fontWeight: "600",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    faqAnswer: {
        padding: "0 24px 24px",
        color: "#94a3b8",
        lineHeight: "1.6",
        fontSize: "15px",
    },
    closingSection: {
        padding: "100px 20px 150px",
        display: "flex",
        justifyContent: "center",
        position: "relative",
        zIndex: 1,
    },
    ctaCard: {
        maxWidth: "900px",
        width: "100%",
        background: "linear-gradient(135deg, rgba(168, 127, 251, 0.1) 0%, rgba(88, 166, 255, 0.1) 100%)",
        padding: "60px 40px",
        borderRadius: "32px",
        textAlign: "center",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(20px)",
    },
    ctaTitle: {
        fontSize: "clamp(28px, 4vw, 36px)",
        fontWeight: "800",
        marginBottom: "20px",
    },
    ctaSubtitle: {
        fontSize: "18px",
        color: "#94a3b8",
        marginBottom: "40px",
        maxWidth: "600px",
        margin: "0 auto 40px",
    },
    ctaButton: {
        padding: "18px 48px",
        borderRadius: "35px",
        background: "linear-gradient(135deg, #a87ffb 0%, #58a6ff 100%)",
        color: "#ffffff",
        fontSize: "18px",
        fontWeight: "700",
        border: "none",
        cursor: "pointer",
        boxShadow: "0 15px 35px rgba(168, 127, 251, 0.5)",
    },
    footer: {
        padding: "40px 20px",
        textAlign: "center",
        color: "#4b5563",
        fontSize: "14px",
        borderTop: "1px solid rgba(255, 255, 255, 0.03)",
    },
};

export default Home;
