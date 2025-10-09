import React, { useState, useCallback } from 'react';
import { GameMode, CardColor } from '../types';
import { parseFile } from '../services/fileParser';
import { CARD_COLORS } from '../constants';
import { getErrorMessage } from '../utils';

interface SetupFormProps {
  onSubmit: (title: string, mode: GameMode, inputText: string, cardCount: number, color: CardColor) => void;
  error: string | null;
  onBack: () => void;
}

const SetupForm: React.FC<SetupFormProps> = ({ onSubmit, error, onBack }) => {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<GameMode>(GameMode.CLASSIC);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [cardCount, setCardCount] = useState(10);
  const [color, setColor] = useState<CardColor>(CardColor.Blue);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsProcessingFile(true);
      setFormError(null);
      setText(''); // Clear previous text
      try {
        const fileContent = await parseFile(selectedFile);
        if (!fileContent.trim()) {
            setFormError("The selected file is empty or could not be read. Please provide a file with text content.");
        } else {
            setText(fileContent);
        }
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        console.error("File parsing error:", errorMessage);
        setFormError(`Failed to parse file: ${errorMessage}`);
      } finally {
        setIsProcessingFile(false);
      }
    }
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()){
      setFormError('Please enter a title for your flashcard deck.');
      return;
    }
    if (!text.trim()) {
      setFormError('Please provide study material by pasting text or uploading a valid file.');
      return;
    }
    onSubmit(title, mode, text, cardCount, color);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl mx-auto w-full transition-all duration-300 border border-primary-200 animate-[fade-in-up_0.5s_ease-out]">
       <style>{`
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `}</style>
      <h1 className="text-4xl font-extrabold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
        Create a New Deck
      </h1>
      <p className="text-center text-primary-500 mb-8">Create your AI-powered study set in seconds.</p>

      {error && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}
      {formError && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">{formError}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-primary-600 mb-2">Deck Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Chapter 5: Photosynthesis"
            className="w-full bg-primary-100 border border-primary-300 rounded-md px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-primary-600 mb-2">Game Mode</label>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setMode(GameMode.CLASSIC)} className={`p-4 rounded-lg text-left transition-all ${mode === GameMode.CLASSIC ? 'bg-primary-500 text-white ring-2 ring-primary-400' : 'bg-primary-200 text-primary-600 hover:bg-primary-300/70'}`}>
              <span className="font-bold">Classic Mode</span>
              <p className="text-sm opacity-90">Flip cards to reveal answers.</p>
            </button>
            <button type="button" onClick={() => setMode(GameMode.QUIZ)} className={`p-4 rounded-lg text-left transition-all ${mode === GameMode.QUIZ ? 'bg-primary-500 text-white ring-2 ring-primary-400' : 'bg-primary-200 text-primary-600 hover:bg-primary-300/70'}`}>
              <span className="font-bold">Quiz Mode</span>
              <p className="text-sm opacity-90">Multiple choice questions.</p>
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-primary-600 mb-2">Study Material</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your notes here..."
            className="w-full h-32 bg-primary-100 border border-primary-300 rounded-md px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
          <div className="text-center text-primary-400 my-2">OR</div>
          <label htmlFor="file-upload" className="w-full flex justify-center items-center px-4 py-2 bg-white text-primary-500 rounded-md shadow-sm tracking-wide border border-primary-300 cursor-pointer hover:bg-primary-100 hover:text-primary-600">
            <svg className="w-6 h-6 mr-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3v-3h2v3z" /></svg>
            <span className="text-base leading-normal">{file ? file.name : 'Upload a file (.txt, .pdf, .docx)'}</span>
            <input id="file-upload" type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={handleFileChange} />
          </label>
          {isProcessingFile && <p className="text-sm text-center text-primary-500 mt-2">Processing file...</p>}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="card-count" className="block text-sm font-medium text-primary-600 mb-2">Number of Cards</label>
            <input
              id="card-count"
              type="number"
              value={cardCount}
              onChange={(e) => setCardCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-primary-100 border border-primary-300 rounded-md px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              min="1"
              max="50"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-primary-600 mb-2">Card Color</label>
            <div className="flex items-center space-x-2 mt-2">
              {Object.values(CardColor).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full ${CARD_COLORS[c].bg} transition-transform transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-white ring-primary-500' : ''}`}
                  aria-label={`Select ${c} color`}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row gap-4">
            <button type="button" onClick={onBack} className="w-full sm:w-auto text-lg font-bold bg-primary-200 text-primary-600 rounded-lg py-3 px-6 transition-all hover:bg-primary-300/80">
                Back
            </button>
            <button type="submit" disabled={isProcessingFile || !text.trim()} className="w-full sm:flex-1 text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
                Generate Flashcards
            </button>
        </div>
      </form>
    </div>
  );
};

export default SetupForm;