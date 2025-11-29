import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ComparisonSlider } from './components/ComparisonSlider';
import { colorizeImage, upscaleImage, beautifyImage, customProcessImage, upscaleBase64 } from './services/geminiService';
import { AppView, ProcessedImage, ProcessingMode } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.UPLOAD);
  const [images, setImages] = useState<ProcessedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<ProcessingMode>('COLORIZE');
  
  // State for Custom Mode
  const [isCustomInputVisible, setIsCustomInputVisible] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // State for 4K download processing
  const [isUpscalingDownload, setIsUpscalingDownload] = useState(false);

  const handleImageSelect = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setView(AppView.SELECTION);
    setError(null);
    setIsCustomInputVisible(false);
    setCustomPrompt('');
  }, []);

  const handleProcess = useCallback(async (processMode: ProcessingMode) => {
    if (!selectedFile || !previewUrl) return;
    
    // If Custom mode is selected but no prompt is given yet, show input
    if (processMode === 'CUSTOM' && !customPrompt) {
      setIsCustomInputVisible(true);
      return;
    }

    setMode(processMode);
    setView(AppView.PROCESSING);
    setError(null);

    try {
      let resultUrl = '';
      
      if (processMode === 'COLORIZE') {
        resultUrl = await colorizeImage(selectedFile);
      } else if (processMode === 'UPSCALE') {
        resultUrl = await upscaleImage(selectedFile);
      } else if (processMode === 'BEAUTY') {
        resultUrl = await beautifyImage(selectedFile);
      } else if (processMode === 'CUSTOM') {
        if (!customPrompt.trim()) throw new Error("Please enter a prompt");
        resultUrl = await customProcessImage(selectedFile, customPrompt);
      }
      
      setImages({
        originalUrl: previewUrl,
        colorizedUrl: resultUrl,
        originalFile: selectedFile
      });
      setView(AppView.RESULT);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to process image");
      setView(AppView.SELECTION); // Go back to selection on error
    }
  }, [selectedFile, previewUrl, customPrompt]);

  const handleDownload4K = async () => {
    if (!images || !images.colorizedUrl) return;
    
    setIsUpscalingDownload(true);
    try {
      const upscaledBase64 = await upscaleBase64(images.colorizedUrl);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = upscaledBase64;
      link.download = `chromarevive-4k-${mode.toLowerCase()}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to upscale for download", err);
      alert("Failed to prepare 4K download.");
    } finally {
      setIsUpscalingDownload(false);
    }
  };

  const handleReset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImages(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setView(AppView.UPLOAD);
    setError(null);
    setIsCustomInputVisible(false);
    setCustomPrompt('');
    setIsUpscalingDownload(false);
  }, [previewUrl]);

  const getProcessingTitle = () => {
    switch(mode) {
      case 'COLORIZE': return 'Adding Magic...';
      case 'UPSCALE': return 'Enhancing Details...';
      case 'BEAUTY': return 'Retouching Face...';
      case 'CUSTOM': return 'Applying Custom Magic...';
      default: return 'Processing...';
    }
  };

  const getProcessingDescription = () => {
    switch(mode) {
      case 'COLORIZE': return 'Analyzing the image and generating realistic colors. This may take a few seconds.';
      case 'UPSCALE': return 'Upscaling resolution and removing blur. Please wait while we sharpen your image.';
      case 'BEAUTY': return 'Smoothing skin and enhancing facial features for a natural glow.';
      case 'CUSTOM': return `Generating image based on: "${customPrompt}"`;
      default: return 'Please wait...';
    }
  };

  const getResultLabel = () => {
    switch(mode) {
      case 'COLORIZE': return 'COLORIZED';
      case 'UPSCALE': return 'UPSCALED 4K';
      case 'BEAUTY': return 'BEAUTY AI';
      case 'CUSTOM': return 'CUSTOM AI';
      default: return 'PROCESSED';
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0f172a] to-[#0f172a] text-slate-200 font-sans">
      
      {/* Header */}
      <header className="p-6 border-b border-slate-800/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo - Clickable to go Home */}
          <button 
            onClick={handleReset} 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none"
            title="Go to Home"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
              CR
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">ChromaRevive</h1>
          </button>

          {/* Home Button - Visible if not on Upload screen */}
          {view !== AppView.UPLOAD && (
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all shadow-lg border border-slate-700/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M11.47 3.84a.75.75 0 011.06 0l8.635 8.635a.75.75 0 11-1.06 1.06l-.312-.312V21a.75.75 0 01-0.75.75H2.25a.75.75 0 01-0.75-0.75V13.223l-.312.312a.75.75 0 11-1.06-1.06L11.47 3.84z" />
              </svg>
              <span>Home</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-[80vh]">
        
        {/* Error Message */}
        {error && (
          <div className="w-full max-w-2xl mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {/* View: Upload */}
        {view === AppView.UPLOAD && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                Bring Your Photos to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Life</span>
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Restore old memories, unblur moments, and enhance details with powerful AI. 
                Instant, secure, and completely free.
              </p>
            </div>
            <ImageUploader onImageSelected={handleImageSelect} />
          </div>
        )}

        {/* View: Selection */}
        {view === AppView.SELECTION && previewUrl && (
          <div className="w-full max-w-4xl animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                {/* Left: Preview */}
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 shadow-xl">
                  <img src={previewUrl} alt="Preview" className="w-full h-auto rounded-xl shadow-md" />
                  <p className="text-center text-slate-500 mt-3 text-sm font-medium">Original Image</p>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-2xl font-bold text-white mb-2">Choose an Action</h3>
                  
                  {!isCustomInputVisible ? (
                    <>
                      {/* Colorize Button */}
                      <button 
                        onClick={() => handleProcess('COLORIZE')}
                        className="group relative flex items-center p-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500 rounded-xl transition-all duration-300 shadow-lg hover:shadow-indigo-500/20 text-left"
                      >
                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a16.001 16.001 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">Colorize B&W</h4>
                          <p className="text-sm text-slate-400">Turn black and white photos into color.</p>
                        </div>
                      </button>

                      {/* Upscale Button */}
                      <button 
                        onClick={() => handleProcess('UPSCALE')}
                        className="group relative flex items-center p-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-emerald-500 rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/20 text-left"
                      >
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-emerald-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">Fix Blur & Upscale</h4>
                          <p className="text-sm text-slate-400">Sharpen details and upscale to 4K.</p>
                        </div>
                      </button>

                      {/* Beauty Button */}
                      <button 
                        onClick={() => handleProcess('BEAUTY')}
                        className="group relative flex items-center p-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-pink-500 rounded-xl transition-all duration-300 shadow-lg hover:shadow-pink-500/20 text-left"
                      >
                         <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-pink-400">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white group-hover:text-pink-400 transition-colors">Face Beauty AI</h4>
                          <p className="text-sm text-slate-400">Smooth skin and enhance features.</p>
                        </div>
                      </button>

                       {/* Custom Magic Button */}
                       <button 
                        onClick={() => setIsCustomInputVisible(true)}
                        className="group relative flex items-center p-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-violet-500 rounded-xl transition-all duration-300 shadow-lg hover:shadow-violet-500/20 text-left"
                      >
                         <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-violet-400">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors">Custom Magic</h4>
                          <p className="text-sm text-slate-400">Describe what you want to change.</p>
                        </div>
                      </button>
                    </>
                  ) : (
                    /* Custom Prompt Input View */
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in">
                       <h4 className="text-lg font-bold text-white mb-2">Describe your magic request</h4>
                       <textarea 
                        className="w-full h-32 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none mb-4"
                        placeholder="E.g., 'Make the background a snowy mountain', 'Turn the person into a cartoon'..."
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                       />
                       <div className="flex gap-3">
                         <button 
                          onClick={() => setIsCustomInputVisible(false)}
                          className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
                         >
                           Cancel
                         </button>
                         <button 
                          onClick={() => handleProcess('CUSTOM')}
                          disabled={!customPrompt.trim()}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all shadow-lg ${
                            customPrompt.trim() 
                              ? 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/25' 
                              : 'bg-slate-600 cursor-not-allowed opacity-50'
                          }`}
                         >
                           Generate
                         </button>
                       </div>
                    </div>
                  )}

                </div>
             </div>
          </div>
        )}

        {/* View: Processing */}
        {view === AppView.PROCESSING && (
          <div className="flex flex-col items-center justify-center animate-fade-in">
             <div className="relative w-24 h-24 mb-8">
               <div className="absolute inset-0 border-t-4 border-indigo-500 border-solid rounded-full animate-spin"></div>
               <div className="absolute inset-0 border-r-4 border-purple-500 border-solid rounded-full animate-spin [animation-delay:-0.15s]"></div>
               <div className="absolute inset-0 border-b-4 border-pink-500 border-solid rounded-full animate-spin [animation-delay:-0.3s]"></div>
             </div>
             <h3 className="text-2xl font-bold text-white mb-2">{getProcessingTitle()}</h3>
             <p className="text-slate-400 max-w-sm text-center animate-pulse">{getProcessingDescription()}</p>
          </div>
        )}

        {/* View: Result */}
        {view === AppView.RESULT && images && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <ComparisonSlider 
              beforeImage={images.originalUrl}
              afterImage={images.colorizedUrl}
              afterLabel={getResultLabel()}
            />

            <div className="mt-8 flex flex-wrap justify-center gap-4">
               {/* 4K Download Button */}
               <button 
                onClick={handleDownload4K}
                disabled={isUpscalingDownload}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-lg shadow-xl shadow-orange-500/30 transform hover:-translate-y-1 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
               >
                 {isUpscalingDownload ? (
                   <>
                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     Upscaling...
                   </>
                 ) : (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l-3-3m0 0l3-3m-3 3h7.5" transform="rotate(180 12 12)" />
                     </svg>
                     Download 4K (Ultra HD)
                   </>
                 )}
               </button>
              
               <button 
                onClick={handleReset}
                className="px-6 py-3 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors flex items-center gap-2"
               >
                 Process Another
               </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-slate-500 text-sm border-t border-slate-800/60 mt-auto">
        <p>© {new Date().getFullYear()} ChromaRevive. Powered by Google Gemini AI.</p>
      </footer>

    </div>
  );
};

export default App;