import React, { useState, useCallback } from 'react';
import { GameMode, CardColor } from '../types';
import { parseFile } from '../services/fileParser';
import { CARD_COLORS } from '../constants';

interface SetupFormProps {
  onSubmit: (title: string, mode: GameMode, inputText: string, cardCount: number, color: CardColor) => void;
  error: string | null;
}

const SetupForm: React.FC<SetupFormProps> = ({ onSubmit, error }) => {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<GameMode>(GameMode.CLASSIC);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [cardCount, setCardCount] = useState(10);
  const [color, setColor] = useState<CardColor>(CardColor.Blue);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsProcessingFile(true);
      try {
        const fileContent = await parseFile(selectedFile);
        setText(fileContent);
      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        alert(`Failed to parse file: ${errorMessage}`);
      } finally {
        setIsProcessingFile(false);
      }
    }
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      alert('Please provide some text or upload a file.');
      return;
    }
    if (!title.trim()){
      alert('Please enter a title for your flashcard deck.');
      return;
    }
    onSubmit(title, mode, text, cardCount, color);
  };

  return (
    <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-2xl mx-auto w-full transition-all duration-300">
      <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        Gemini Flashcard Generator
      </h1>
      <p className="text-center text-slate-400 mb-8">Create your study set in seconds.</p>

      {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">Deck Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Chapter 5: Photosynthesis"
            className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Game Mode</label>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setMode(GameMode.CLASSIC)} className={`p-4 rounded-lg text-left transition-all ${mode === GameMode.CLASSIC ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-slate-700 hover:bg-slate-600'}`}>
              <span className="font-bold">Classic Mode</span>
              <p className="text-sm text-slate-300">Flip cards to reveal answers.</p>
            </button>
            <button type="button" onClick={() => setMode(GameMode.QUIZ)} className={`p-4 rounded-lg text-left transition-all ${mode === GameMode.QUIZ ? 'bg-purple-600 ring-2 ring-purple-400' : 'bg-slate-700 hover:bg-slate-600'}`}>
              <span className="font-bold">Quiz Mode</span>
              <p className="text-sm text-slate-300">Multiple choice questions.</p>
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Study Material</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your notes here..."
            className="w-full h-32 bg-slate-700 border border-slate-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <div className="text-center text-slate-400 my-2">OR</div>
          <label htmlFor="file-upload" className="w-full flex justify-center items-center px-4 py-2 bg-slate-700 text-slate-300 rounded-md shadow-sm tracking-wide border border-slate-600 cursor-pointer hover:bg-slate-600 hover:text-white">
            <svg className="w-6 h-6 mr-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3v-3h2v3z" /></svg>
            <span className="text-base leading-normal">{file ? file.name : 'Upload a file (.txt, .pdf, .docx)'}</span>
            <input id="file-upload" type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={handleFileChange} />
          </label>
          {isProcessingFile && <p className="text-sm text-center text-blue-400 mt-2">Processing file...</p>}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="card-count" className="block text-sm font-medium text-slate-300 mb-2">Number of Cards</label>
            <input
              id="card-count"
              type="number"
              value={cardCount}
              onChange={(e) => setCardCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              min="1"
              max="50"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-2">Card Color</label>
            <div className="flex items-center space-x-2 mt-2">
              {Object.values(CardColor).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full ${CARD_COLORS[c].bg} transition-transform transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white' : ''}`}
                  aria-label={`Select ${c} color`}
                />
              ))}
            </div>
          </div>
        </div>
        
        <button type="submit" disabled={isProcessingFile || !text} className="w-full text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg py-3 px-6 transition-all hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
          Generate Flashcards
        </button>
      </form>
    </div>
  );
};

export default SetupForm;