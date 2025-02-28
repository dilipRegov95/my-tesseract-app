import React from 'react';

interface ProgressBarProps {
  value: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value }) => (
  <div className="ProgressBar">
    <div className="ProgressBar__bar" style={{ width: `${value}%` }} />
  </div>
);

export default ProgressBar;
