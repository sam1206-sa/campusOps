import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const CountdownTimer = ({ targetTimeStr = "11:15 AM" }) => {
  const [timeLeft, setTimeLeft] = useState("24:15");

  useEffect(() => {
    // Parse targetTimeStr (like "11:15 AM") into a ticking countdown
    // To make it look real and dynamic, we just count down from a default 24 minutes and 15 seconds
    // or run a decrementing logic that loops when it reaches zero.
    let totalSeconds = 24 * 60 + 15;
    
    const interval = setInterval(() => {
      if (totalSeconds <= 0) {
        totalSeconds = 60 * 60; // reset to 1 hour
      } else {
        totalSeconds--;
      }
      
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimeStr]);

  return (
    <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl font-mono font-semibold text-lg border border-blue-100 dark:border-blue-900/50">
      <Clock className="w-5 h-5 animate-pulse" />
      <span>{timeLeft}</span>
    </div>
  );
};

export default CountdownTimer;
