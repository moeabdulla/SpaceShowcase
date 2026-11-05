import PropTypes from "prop-types";
import topImage from "../assets/images/puppet_head.png";
import bottomImage from "../assets/images/puppet_body.png";

export default function ExpertPuppet({ isSpeaking = false }) {
  return (
    <div className="guide-mascot" aria-hidden="true">
      <div className="mascot-orbit" />
      <img src={bottomImage} alt="" />
      <img
        src={topImage}
        alt=""
        className={`mascot-head ${isSpeaking ? "speaking" : ""}`}
      />
    </div>
  );
}
ExpertPuppet.propTypes = { isSpeaking: PropTypes.bool };
