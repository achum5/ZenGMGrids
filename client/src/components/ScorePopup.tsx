import React from 'react';
import './score-popup.css';

interface ScorePopupProps {
  amount: number;
  style: React.CSSProperties;
}

export const ScorePopup: React.FC<ScorePopupProps> = ({ amount, style }) => {
  return (
    <div className="score-popup" style={style}>
      +{amount}
    </div>
  );
};
