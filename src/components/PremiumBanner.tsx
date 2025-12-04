import React, { useState } from 'react';

interface PremiumBannerProps {
  onDismiss?: () => void;
}

const PremiumBanner: React.FC<PremiumBannerProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#FEF3C7',
      borderBottom: '1px solid #F59E0B',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      zIndex: 1000,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flex: 1,
      }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ flexShrink: 0 }}
        >
          <path
            d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z"
            fill="#D97706"
          />
        </svg>
        <span style={{
          color: '#92400E',
          fontSize: '13px',
          lineHeight: '1.4',
        }}>
          <strong>Free Plan:</strong> This widget will be hidden on your published site.
          Upgrade to a premium plan to display it to your visitors.
        </span>
      </div>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#92400E',
          flexShrink: 0,
        }}
        aria-label="Dismiss warning"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.5 3.5L3.5 12.5M3.5 3.5L12.5 12.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
};

export default PremiumBanner;
