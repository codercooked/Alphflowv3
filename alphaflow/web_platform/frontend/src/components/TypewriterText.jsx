import React, { useState, useEffect } from 'react';

const TypewriterText = () => {
  const words = ["Stocks", "Crypto", "Mutual Funds", "IPOs"];
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [blink, setBlink] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (index === words.length) setIndex(0);
  }, [index, words.length]);

  useEffect(() => {
    if (index === words.length) return;

    // Pause before deleting
    if (subIndex === words[index].length && !isDeleting) {
      const pause = setTimeout(() => setIsDeleting(true), 2000);
      return () => clearTimeout(pause);
    }

    // Move to next word after deleting
    if (subIndex === 0 && isDeleting) {
      setIsDeleting(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (isDeleting ? -1 : 1));
    }, isDeleting ? 60 : 120);

    return () => clearTimeout(timeout);
  }, [subIndex, index, isDeleting]);

  // Cursor blink effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink((prev) => !prev);
    }, 500);
    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div 
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        width: '100%',
        textShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}
    >
      <h1 style={{ fontSize: '4.5rem', fontWeight: '800', margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
        Finance Simplified.
      </h1>
      <h2 style={{ fontSize: '2.5rem', fontWeight: '400', margin: 0, color: '#f59e0b', textShadow: '0 0 10px rgba(245, 158, 11, 0.5)' }}>
        {`${words[index].substring(0, subIndex)}${blink ? "|" : " "}`}
      </h2>
    </div>
  );
};

export default TypewriterText;
