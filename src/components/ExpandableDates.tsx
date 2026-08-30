import React, { useState } from 'react';

export const ExpandableDates: React.FC<{ dates: string[] }> = ({ dates }) => {
  const [showAll, setShowAll] = useState(false);

  if (!dates || dates.length === 0) return null;
  if (dates.length <= 3) {
    return <span className="opacity-60 text-[10px] font-mono">{dates.join(' • ')}</span>;
  }

  if (showAll) {
    return (
      <span className="opacity-75 text-[10px] font-mono flex flex-wrap items-center gap-1">
        <span>{dates.join(' • ')}</span>
        <button
          onClick={() => setShowAll(false)}
          className="text-indigo-400 underline font-bold text-[10px] cursor-pointer hover:opacity-80 ml-1"
        >
          weniger
        </button>
      </span>
    );
  }

  return (
    <span className="opacity-60 text-[10px] font-mono inline-flex items-center gap-1">
      <span>{dates.slice(0, 3).join(' • ')}</span>
      <button
        onClick={() => setShowAll(true)}
        className="text-indigo-400 font-bold hover:underline cursor-pointer ml-1"
        title={dates.join(' • ')}
      >
        +{dates.length - 3} weitere
      </button>
    </span>
  );
};

export default ExpandableDates;
