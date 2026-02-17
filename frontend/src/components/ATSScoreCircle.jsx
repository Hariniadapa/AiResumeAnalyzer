import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

function ATSScoreCircle({ score }) {
  return (
    <div style={{ width: 150, margin: "20px auto" }}>
      <CircularProgressbar
        value={score}
        text={`${score}%`}
        styles={buildStyles({
          pathColor: "#6c63ff",
          textColor: "#333",
          trailColor: "#eee",
        })}
      />
    </div>
  );
}

export default ATSScoreCircle;
