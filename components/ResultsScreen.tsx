
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { StudyResult } from '../types';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface ResultsScreenProps {
  // Props are now optional
  results?: StudyResult[];
  onRestart?: () => void;
  onBackToDecks?: () => void;
  title?: string;
}

const ResultsScreen: React.FC<ResultsScreenProps> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Use props if provided (for co-op), otherwise use location state
  const { results, deckConfig, deckId, subjectId } = location.state || {};
  const finalResults = props.results || results;
  const finalTitle = props.title || deckConfig?.title;
  
  if (!finalResults || !finalTitle) {
      // If there's no state, redirect to a safe page.
      return <Navigate to={user ? "/your-cards" : "/login"} replace />;
  }

  const handleRestart = () => {
    if (props.onRestart) return props.onRestart();
    
    if (user && deckId) {
      const path = subjectId ? `/study-subject-deck/${deckId}/subject/${subjectId}` : `/study-deck/${deckId}`;
      navigate(path);
    } else {
      navigate('/guest/study', {
        state: { cards: finalResults.map((r: any) => r.card), deckConfig }
      });
    }
  };

  const handleBackToCards = () => {
    if (props.onBackToDecks) return props.onBackToDecks();

    if (subjectId) navigate(`/your-subjects/${subjectId}`);
    else navigate(user ? '/your-cards' : '/guest/create');
  };


  const correctCount = finalResults.filter(r => r.isCorrect).length;
  const incorrectCount = finalResults.length - correctCount;
  const total = finalResults.length;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const data = [
    { name: 'Correct', value: correctCount },
    { name: 'Incorrect', value: incorrectCount },
  ];

  const COLORS = ['#10B981', '#EF4444'];

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-2xl mx-auto w-full text-center animate-[fade-in_0.5s_ease-out] border border-primary-200 dark:border-gray-700">
        <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
        `}</style>
      <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600 mb-2">
        Session Complete!
      </h1>
      <p className="text-xl text-primary-500 dark:text-primary-300 mb-6">Results for "{finalTitle}"</p>
      
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
        <div className="w-full md:w-1/2 h-64">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
              <Legend wrapperStyle={{ color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-1/2 text-left space-y-3">
            <div className="bg-primary-100 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-primary-500 dark:text-gray-400">Score</p>
                <p className="text-4xl font-bold text-primary-700 dark:text-gray-200">{percentage}%</p>
            </div>
            <div className="bg-primary-100 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-primary-500 dark:text-gray-400">Correct Answers</p>
                <p className="text-2xl font-bold text-green-500">{correctCount} / {total}</p>
            </div>
            <div className="bg-primary-100 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-primary-500 dark:text-gray-400">Incorrect Answers</p>
                <p className="text-2xl font-bold text-red-500">{incorrectCount} / {total}</p>
            </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={handleRestart}
          className="w-full sm:w-auto text-lg font-bold bg-primary-500 text-white rounded-lg py-3 px-8 transition-colors hover:bg-primary-600"
        >
          Study Again
        </button>
        <button 
          onClick={handleBackToCards}
          className="w-full sm:w-auto text-lg font-bold bg-primary-300 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-lg py-3 px-8 transition-colors hover:bg-primary-400/80 dark:hover:bg-gray-600"
        >
          {user ? 'Back to Cards' : 'Create New Deck'}
        </button>
      </div>
    </div>
  );
};

export default ResultsScreen;
