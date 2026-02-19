import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
);

interface LoadingViewProps {
  title?: string;
  message?: string;
  onCancel?: () => void;
}

const LoadingView: React.FC<LoadingViewProps> = ({ 
  title = "Generating Your Flashcards...", 
  message = "The AI is working its magic. This might take a moment.",
  onCancel 
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-primary-200 dark:border-gray-700">
      <LoadingSpinner />
      <h2 className="text-3xl font-bold mt-6 text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
        {title}
      </h2>
      <p className="text-primary-500 dark:text-primary-300 mt-2">{message}</p>
      {onCancel && (
        <button 
          onClick={onCancel}
          className="mt-8 text-lg font-bold bg-primary-200 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-lg py-3 px-8 transition-all hover:bg-primary-300/80 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
        >
          Cancel
        </button>
      )}
    </div>
  );
};

export default LoadingView;