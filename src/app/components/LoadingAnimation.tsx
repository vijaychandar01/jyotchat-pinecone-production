import React, { useEffect } from 'react';

const LoadingAnimation: React.FC = () => {
  useEffect(() => {
    // Insert keyframes on the client side only
    const styleSheet = document.styleSheets[0];
    const keyframes = `
      @keyframes loadingAnimation {
        0%, 80%, 100% {
          transform: scale(0);
          opacity: 0.7;
        }
        40% {
          transform: scale(1);
          opacity: 1;
        }
      }
    `;
    styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.dot}></div>
      <div style={{ ...styles.dot, ...styles.dot2 }}></div>
      <div style={{ ...styles.dot, ...styles.dot3 }}></div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '24px',
    gap: '8px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#6B7280', // Tailwind Gray-600
    animation: 'loadingAnimation 1s infinite ease-in-out',
  },
  dot2: {
    animationDelay: '0.1s',
  },
  dot3: {
    animationDelay: '0.2s',
  },
};

export default LoadingAnimation;
