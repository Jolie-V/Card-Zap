
import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400"></div>
);

const LoadingView: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-800 rounded-2xl shadow-2xl">
      <LoadingSpinner />
      <h2 className="text-3xl font-bold mt-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        Generating Your Flashcards...
      </h2>
      <p className="text-slate-400 mt-2">The AI is working its magic. This might take a moment.</p>
    </div>
  );
};

export default LoadingView;
