
import React, { useState, useCallback, useEffect } from 'react';
import { GameMode, CardColor } from '../types';
import { parseFile } from '../services/fileParser';
import { getErrorMessage } from '../utils';
import { CARD_COLORS } from '../constants';
import { CardsIcon, GameControllerIcon } from './icons';

interface SetupFormProps {
  onSubmit: (title: string, mode: GameMode, inputText: string, cardCount: number, color: CardColor, isAssessment: boolean) => void;
  error: string | null;
  onBack: () => void;
}

const SetupForm: React.FC<SetupFormProps> = ({ onSubmit, error, onBack }) => {
  // Visible fields
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<GameMode>(GameMode.CLASSIC);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [cardCount, setCardCount] = useState<number>(15);
  const [color, setColor] = useState<CardColor>(CardColor.Blue);
  
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    // Load state from sessionStorage on component mount
    const savedState = sessionStorage.getItem('cardzap_form_state');
    if (savedState) {
        try {
            const { text, cardCount, title, mode, color } = JSON.parse(savedState);
            setText(text || '');
            setCardCount(cardCount || 15);
            if (title) setTitle(title);
            if (mode) setMode(mode);
            if (color) setColor(color);
        } catch (e) {
            console.error("Could not parse saved form state:", e);
            sessionStorage.removeItem('cardzap_form_state');
        }
    }
  }, []);

  useEffect(() => {
    // Save state to sessionStorage whenever it changes
    const stateToSave = JSON.stringify({ text, cardCount, title, mode, color });
    sessionStorage.setItem('cardzap_form_state', stateToSave);
  }, [text, cardCount, title, mode, color]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsProcessingFile(true);
      setFormError(null);
      setText(''); // Clear previous text
      
      // Auto-set title from filename if title is empty
      if (!title) {
          setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }

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
  }, [title]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!text.trim()) {
      setFormError('Please provide study material by pasting text or uploading a valid file.');
      return;
    }

    // Default configuration if title is empty
    let finalTitle = title.trim();
    if (!finalTitle) {
        if (file && file.name) {
            finalTitle = file.name.replace(/\.[^/.]+$/, "");
        } else {
            finalTitle = 'My Study Deck';
        }
    }
    
    // isAssessment is false for standard creation flow
    onSubmit(finalTitle, mode, text, cardCount, color, false);
  };

  const getSliderDescription = (count: number) => {
    if (count <= 10) return "Good for a quick review.";
    if (count <= 25) return "A solid study set.";
    if (count <= 40) return "Great for a deep dive.";
    return "A comprehensive deck.";
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl max-w-2xl mx-auto w-full transition-all duration-300 border border-primary-200 dark:border-gray-700 animate-[fade-in-up_0.5s_ease-out]">
       <style>{`
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            /* Custom Range Slider Styles */
            .range-slider {
              -webkit-appearance: none;
              width: 100%;
              background: transparent;
            }
            .range-slider:focus {
              outline: none;
            }
            /* Thumb */
            .range-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              height: 20px;
              width: 20px;
              border-radius: 50%;
              background: #3A728E; /* primary-500 */
              cursor: pointer;
              margin-top: -8px; /* You need to specify a margin in Chrome, but not in Firefox */
              box-shadow: 0 0 5px rgba(0,0,0,0.2);
            }
            .dark .range-slider::-webkit-slider-thumb {
              background: #86B6C6; /* primary-300 */
            }
            .range-slider::-moz-range-thumb {
              height: 20px;
              width: 20px;
              border-radius: 50%;
              background: #3A728E; /* primary-500 */
              cursor: pointer;
              box-shadow: 0 0 5px rgba(0,0,0,0.2);
              border: none;
            }
            .dark .range-slider::-moz-range-thumb {
               background: #86B6C6; /* primary-300 */
            }
            /* Track */
            .range-slider::-webkit-slider-runnable-track {
              width: 100%;
              height: 4px;
              cursor: pointer;
              background: #B7D9E2; /* primary-200 */
              border-radius: 5px;
            }
            .dark .range-slider::-webkit-slider-runnable-track {
              background: #1F5372; /* primary-600 */
            }
            .range-slider::-moz-range-track {
              width: 100%;
              height: 4px;
              cursor: pointer;
              background: #B7D9E2; /* primary-200 */
              border-radius: 5px;
            }
            .dark .range-slider::-moz-range-track {
              background: #1F5372; /* primary-600 */
            }
        `}</style>
      <h1 className="text-4xl font-extrabold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
        Create a New Deck
      </h1>
      <p className="text-center text-primary-500 dark:text-primary-300 mb-8">
        Create your AI-powered study set in seconds.
      </p>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>
      )}
      
      {formError && <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">{formError}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Title Input */}
        <div>
            <label htmlFor="deck-title" className="block text-sm font-medium text-primary-600 dark:text-primary-200 mb-2">Deck Title</label>
            <input
                id="deck-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 5: Photosynthesis"
                className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-4 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm"
            />
        </div>

        {/* Study Material Section */}
        <div>
          <label className="block text-sm font-medium text-primary-600 dark:text-primary-200 mb-2">Study Material</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your notes here..."
            className="w-full h-32 bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-4 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none"
          />
          <div className="text-center text-primary-400 my-2 text-sm font-semibold">OR</div>
          <label htmlFor="file-upload" className="w-full flex justify-center items-center px-4 py-3 bg-white dark:bg-gray-700 text-primary-500 dark:text-primary-300 rounded-md shadow-sm tracking-wide border border-primary-300 dark:border-gray-500 cursor-pointer hover:bg-primary-100 dark:hover:bg-gray-600 hover:text-primary-600 dark:hover:text-primary-200 transition-colors">
            <svg className="w-6 h-6 mr-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3v-3h2v3z" /></svg>
            <span className="text-base leading-normal">{file ? file.name : 'Upload a file (.txt, .pdf, .docx)'}</span>
            <input id="file-upload" type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={handleFileChange} />
          </label>
          {isProcessingFile && <p className="text-sm text-center text-primary-500 dark:text-primary-400 mt-2">Processing file...</p>}
        </div>

        {/* Game Mode */}
        <div>
            <label className="block text-sm font-medium text-primary-600 dark:text-primary-200 mb-2">Game Mode</label>
            <div className="grid grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => setMode(GameMode.CLASSIC)}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                        mode === GameMode.CLASSIC
                            ? 'border-primary-500 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-100'
                            : 'border-primary-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:border-primary-300'
                    }`}
                >
                    <CardsIcon className="w-8 h-8" />
                    <span className="font-bold">Classic</span>
                    <span className="text-xs opacity-70">Flip cards</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMode(GameMode.QUIZ)}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                        mode === GameMode.QUIZ
                            ? 'border-primary-500 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-100'
                            : 'border-primary-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:border-primary-300'
                    }`}
                >
                    <GameControllerIcon className="w-8 h-8" />
                    <span className="font-bold">Quiz</span>
                    <span className="text-xs opacity-70">Multiple Choice</span>
                </button>
            </div>
        </div>

        {/* Card Count Section */}
        <div>
            <label htmlFor="card-count" className="block text-sm font-medium text-primary-600 dark:text-primary-200 mb-2">
                Number of Cards
            </label>
            <input
                id="card-count"
                type="range"
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
                className="w-full h-2 bg-primary-200 rounded-lg appearance-none cursor-pointer range-slider dark:bg-gray-700"
                min="5"
                max="50"
            />
            <p className="text-xs text-primary-500 dark:text-gray-400 mt-1 text-center">{getSliderDescription(cardCount)} ({cardCount} cards)</p>
        </div>

        {/* Color Selection */}
        <div>
            <label className="block text-sm font-medium text-primary-600 dark:text-primary-200 mb-2">Deck Color</label>
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                {Object.values(CardColor).map((c) => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-full ${CARD_COLORS[c].bg} transition-transform hover:scale-110 focus:outline-none ring-2 ring-offset-2 dark:ring-offset-gray-800 ${color === c ? 'ring-primary-500 scale-110' : 'ring-transparent'}`}
                        aria-label={`Select ${c} color`}
                    />
                ))}
            </div>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4">
            <button type="button" onClick={onBack} className="w-full sm:w-auto text-lg font-bold bg-primary-200 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-lg py-3 px-6 transition-all hover:bg-primary-300/80 dark:hover:bg-gray-600">
                Back
            </button>
            <button type="submit" disabled={isProcessingFile} className="w-full sm:w-auto text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700 shadow-lg shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed">
                Generate Flashcards
            </button>
        </div>
      </form>
    </div>
  );
};

export default SetupForm;
