import React from 'react';
import './AdSlot.css';

const AdSlot = ({ position = 'banner', size = '728x90', label }) => {
  const sizeMap = {
    '728x90': { width: '100%', maxWidth: '728px', minHeight: '90px' },
    '300x250': { width: '300px', minHeight: '250px' },
    '160x600': { width: '160px', minHeight: '600px' },
    '320x50': { width: '100%', maxWidth: '320px', minHeight: '50px' },
    'responsive': { width: '100%', minHeight: '90px' },
  };

  const dimensions = sizeMap[size] || sizeMap['responsive'];
  const displayLabel = label || `Advertisement Banner Slot — ${position.charAt(0).toUpperCase() + position.slice(1)}`;

  return (
    <div
      className={`ad-slot ad-slot-${position}`}
      style={dimensions}
      id={`ad-slot-${position}`}
      data-ad-size={size}
      data-ad-position={position}
    >
      {/* 
        ╔══════════════════════════════════════════════════════╗
        ║  MONETAG / ADSTERRA AD PLACEMENT                    ║
        ║  Replace the inner content of this div with your    ║
        ║  ad network script tags. Example:                   ║
        ║                                                     ║
        ║  <script>                                           ║
        ║    (function(d,z,s){...})(document,'XXXXX','script') ║
        ║  </script>                                          ║
        ╚══════════════════════════════════════════════════════╝
      */}
      <div className="ad-placeholder">
        <span className="ad-icon">📢</span>
        <span className="ad-label">{displayLabel}</span>
        <span className="ad-size">{size}</span>
      </div>
    </div>
  );
};

export default AdSlot;
