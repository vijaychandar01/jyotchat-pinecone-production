import { Check, Copy } from "lucide-react";
import { useCopyToClipboard } from "./CopytoClipboard";

interface CopyContentButtonProps {
  content: string;
}

export const CopyContentButton: React.FC<CopyContentButtonProps> = ({ content }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 });

  const contentBeforeReferences = content.split('References:')[0].trim();

  return (
    <button
      onClick={() => copyToClipboard(contentBeforeReferences)}
      className="h-8 w-8"
      style={{ backgroundColor: 'transparent' }}
    >
      {isCopied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
};
