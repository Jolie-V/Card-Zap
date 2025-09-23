import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { StudyResult } from '../types';

interface ResultsScreenProps {
  results: StudyResult[];
  onRestart: () => void;
  onBackToDecks: () => void;
  title: string;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ results, onRestart, onBackToDecks, title }) => {
  const correctCount = results.filter(r => r.isCorrect).length;
  const incorrectCount = results.length - correctCount;
  const total = results.length;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const data = [
    { name: 'Correct', value: correctCount },
    { name: 'Incorrect', value: incorrectCount },
  ];

  const COLORS = ['#10B981', '#EF4444'];

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl mx-auto w-full text-center animate-[fade-in_0.5s_ease-out] border border-primary-200">
        <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
        `}</style>
      <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-primary-500 mb-2">
        Session Complete!
      </h1>
      <p className="text-xl text-primary-500 mb-6">Results for "{title}"</p>
      
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
        <div className="w-full md:w-1/2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-1/2 text-left space-y-3">
            <div className="bg-primary-100 p-4 rounded-lg">
                <p className="text-primary-500">Score</p>
                <p className="text-4xl font-bold text-primary-700">{percentage}%</p>
            </div>
            <div className="bg-primary-100 p-4 rounded-lg">
                <p className="text-primary-500">Correct Answers</p>
                <p className="text-2xl font-bold text-green-500">{correctCount} / {total}</p>
            </div>
            <div className="bg-primary-100 p-4 rounded-lg">
                <p className="text-primary-500">Incorrect Answers</p>
                <p className="text-2xl font-bold text-red-500">{incorrectCount} / {total}</p>
            </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={onRestart}
          className="w-full sm:w-auto text-lg font-bold bg-primary-500 text-white rounded-lg py-3 px-8 transition-colors hover:bg-primary-600"
        >
          Study Again
        </button>
        <button 
          onClick={onBackToDecks}
          className="w-full sm:w-auto text-lg font-bold bg-primary-300 text-primary-600 rounded-lg py-3 px-8 transition-colors hover:bg-primary-400/80"
        >
          Back to Decks
        </button>
      </div>
    </div>
  );
};

export default ResultsScreen;
