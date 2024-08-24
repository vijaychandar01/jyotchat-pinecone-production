import React from 'react';

interface ConversationStartersProps {
  starters: string[];
  onSelect: (starter: string) => void;
}

const ConversationStarters: React.FC<ConversationStartersProps> = ({ starters, onSelect }) => {
  return (
    <div className="my-4">
      <div className="flex flex-wrap gap-2">
        {starters.map((starter, index) => (
          <button
            key={index}
            onClick={() => onSelect(starter)}
            className="p-2 border border-gray-400 rounded-lg text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
          >
            {starter}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConversationStarters;
