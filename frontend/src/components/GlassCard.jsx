import React from 'react';

const GlassCard = ({ children, className = "", animate = false, ...props }) => {
  const baseClass = "glass-card rounded-2xl p-6 transition-all duration-300";
  const animationClass = animate ? "hover:scale-[1.01] hover:shadow-lg" : "";
  
  return (
    <div className={`${baseClass} ${animationClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default GlassCard;
