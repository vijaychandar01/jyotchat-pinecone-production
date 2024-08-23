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
            className="p-2 bg-orange-800 text-white rounded-lg hover:bg-orange-700 focus:outline-none"
          >
            {starter}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConversationStarters;
