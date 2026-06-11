import { useState } from "react";

const AIParticles = () => {
    const [particles] = useState(() =>
        Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            size: Math.random() * 4 + 2, // 2px to 6px
            left: Math.random() * 100, // 0% to 100%
            top: Math.random() * 100,
            duration: Math.random() * 20 + 10, // 10s to 30s
            delay: Math.random() * 5, // 0s to 5s
            opacity: Math.random() * 0.4 + 0.1, // 0.1 to 0.5
        }))
    );

    return (
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                overflow: "hidden",
                pointerEvents: "none",
                zIndex: 0,
            }}
        >
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="ai-particle"
                    style={{
                        position: "absolute",
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        left: `${p.left}%`,
                        top: `${p.top}%`,
                        backgroundColor: "#a87ffb",
                        borderRadius: "50%",
                        boxShadow: `0 0 ${p.size * 2}px #a87ffb`,
                        opacity: p.opacity,
                        animation: `floatParticle ${p.duration}s infinite linear`,
                        animationDelay: `${p.delay}s`,
                    }}
                />
            ))}
        </div>
    );
};

export default AIParticles;
