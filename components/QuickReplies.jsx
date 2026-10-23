"use client";

import PropTypes from 'prop-types';

export function QuickReplies({ options, onSelect }) {
  if (!options || options.length === 0) return null;

  return (
    <div className="flex max-w-full flex-wrap gap-1.5 px-4 pb-1 sm:px-6">
      {options.map((option, index) => (
        <button
          key={`${option}-${index}`}
          type="button"
          onClick={() => onSelect(option)}
          className="max-w-full whitespace-normal rounded-full border border-[var(--rule)] px-3 py-1.5 text-left text-[12.5px] font-medium leading-tight text-[var(--ink-soft)] transition-all duration-200 hover:bg-[var(--surface)] hover:text-[var(--ink)] active:scale-[0.98]"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

QuickReplies.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string),
  onSelect: PropTypes.func.isRequired
};
