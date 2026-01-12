
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { analyzeMedia, generateSEO, generateThumbnailPrompts, generateNanoBananaImage } from './services/geminiService';
import { Platform, SEOData, AnalysisResult, MediaState, HistoryItem, ThumbnailConcept } from './types';

const PLATFORMS: Platform[] = ['YouTube', 'Instagram', 'Twitter', 'Pinterest'];

const PLATFORM_THEMES: Record<Platform, { icon: string, color: string, glow: string }> = {
  'YouTube': { icon: 'fab fa-youtube', color: 'bg-red-500', glow: 'shadow-red-500/20' },
  'Instagram': { icon: 'fab fa-instagram', color: 'bg-pink-500', glow: 'shadow-pink-500/20' },
  'Twitter': { icon: 'fab fa-x-twitter', color: 'bg-blue-400', glow: 'shadow-blue-400/20' },
  'Pinterest': { icon: 'fab fa-pinterest', color: 'bg-red-600', glow: 'shadow-red-600/20' }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });
};

export default function App() {
  const [media, setMedia] = useState<MediaState>({ file: null, preview: null, type: null, base64: null });
  const [loadingStep, setLoadingStep] = useState<'idle' | 'analyzing' | 'optimizing' | 'visualizing'>('idle');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [platform, setPlatform] = useState<Platform>('YouTube');
  const [seo, setSeo] = useState<SEOData | null>(null);
  const [thumbnailConcepts, setThumbnailConcepts] = useState<ThumbnailConcept[]>([]);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [genImgLoading, setGenImgLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showVault, setShowVault] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('viralvision_v2');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('viralvision_v2', JSON.stringify(history));
  }, [history]);

  const copyToClipboard = (text: string, label: string = "Content") => {
    navigator.clipboard.writeText(text);
    const notification = document.createElement('div');
    notification.className = 'fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full text-sm font-medium shadow-2xl animate-in fade-in slide-in-from-top-4 z-50';
    notification.innerHTML = `<span class="text-indigo-400 mr-2">✓</span> ${label} copied to clipboard`;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('fade-out', 'slide-out-to-top-4');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  };

  const processFlow = async (file: File, selectedPlatform: Platform = platform) => {
    const type = file.type.startsWith('video') ? 'video' : 'image';
    const preview = URL.createObjectURL(file);
    const base64 = await fileToBase64(file);

    setMedia({ file, preview, type, base64 });
    setAnalysis(null);
    setSeo(null);
    setThumbnailConcepts([]);
    setGeneratedThumbnail(null);

    try {
      // Step 1: Analyze
      setLoadingStep('analyzing');
      const analysisRes = await analyzeMedia(base64, file.type);
      setAnalysis(analysisRes);

      // Step 2: SEO (Automatic for speed)
      setLoadingStep('optimizing');
      const seoRes = await generateSEO(analysisRes, selectedPlatform);
      setSeo(seoRes);

      // Step 3: Thumbnails (Automatic for speed)
      setLoadingStep('visualizing');
      const thumbRes = await generateThumbnailPrompts(analysisRes);
      setThumbnailConcepts(thumbRes.concepts);

      // Save to history
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        mediaType: type,
        mediaSummary: analysisRes.summary,
        platform: selectedPlatform,
        analysis: analysisRes,
        seo: seoRes,
        thumbnailConcepts: thumbRes.concepts
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 20));

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStep('idle');
    }
  };

  const handlePlatformChange = async (newPlatform: Platform) => {
    setPlatform(newPlatform);
    if (analysis) {
      setLoadingStep('optimizing');
      const seoRes = await generateSEO(analysis, newPlatform);
      setSeo(seoRes);
      setLoadingStep('idle');
    }
  };

  const handleForgeThumbnail = async (prompt: string) => {
    setGenImgLoading(true);
    setActivePrompt(prompt);
    try {
      const img = await generateNanoBananaImage(prompt);
      setGeneratedThumbnail(img);
    } catch (err) {
      console.error(err);
    } finally {
      setGenImgLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/10 blur-[120px] rounded-full"></div>
      </div>

      <nav className="sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-md border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <i className="fas fa-bolt text-white text-xl"></i>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">ViralVision <span className="text-indigo-400">Pro</span></span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowVault(true)}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium flex items-center gap-2"
            >
              <i className="fas fa-layer-group text-slate-400"></i> Vault
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              <i className="fas fa-plus"></i> New Strategy
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Media Stage */}
          <div className="lg:col-span-5 space-y-8">
            <div className="relative group rounded-3xl overflow-hidden border border-white/10 bg-white/5 aspect-[4/5] flex items-center justify-center cursor-pointer transition-all hover:border-indigo-500/50 shadow-2xl" onClick={() => fileInputRef.current?.click()}>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && processFlow(e.target.files[0])} />
              
              {media.preview ? (
                <div className="w-full h-full relative">
                  {media.type === 'video' ? (
                    <video src={media.preview} className="w-full h-full object-cover" controls autoPlay muted loop />
                  ) : (
                    <img src={media.preview} className="w-full h-full object-cover" alt="Source" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest">Replace Media</span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-10 space-y-4">
                  <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <i className="fas fa-cloud-upload-alt text-3xl text-indigo-400"></i>
                  </div>
                  <h3 className="text-xl font-bold text-white">Drop your media here</h3>
                  <p className="text-slate-400 text-sm max-w-[240px] mx-auto">Upload a video or image to generate a viral strategy instantly.</p>
                </div>
              )}

              {loadingStep !== 'idle' && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-10 space-y-6 z-20">
                   <div className="relative w-24 h-24">
                      <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                   </div>
                   <div className="text-center">
                      <h4 className="text-lg font-bold text-white capitalize">{loadingStep}...</h4>
                      <div className="flex gap-1 mt-4 justify-center">
                         {['analyzing', 'optimizing', 'visualizing'].map(step => (
                           <div key={step} className={`w-10 h-1 rounded-full transition-all duration-500 ${loadingStep === step ? 'bg-indigo-500 w-16' : 'bg-white/10'}`}></div>
                         ))}
                      </div>
                   </div>
                </div>
              )}
            </div>

            {analysis && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-tighter">AI Analysis</span>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{analysis.category}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">/</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{analysis.mood}</span>
                  </div>
                </div>
                <p className="text-lg font-medium leading-relaxed italic text-white">"{analysis.summary}"</p>
                
                {analysis.controversies.length > 0 && (
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                    <h5 className="text-[10px] font-black uppercase text-red-400 mb-2 flex items-center gap-2">
                      <i className="fas fa-exclamation-triangle"></i> Algorithm Alerts
                    </h5>
                    <div className="space-y-2">
                      {analysis.controversies.map((c, i) => (
                        <div key={i} className="text-xs text-red-200/60 leading-tight">
                          <span className="text-red-400 font-bold mr-1">{c.topic}:</span> {c.explanation}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Forge Station */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Platform Selector Bar */}
            <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl overflow-x-auto no-scrollbar">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => handlePlatformChange(p)}
                  className={`flex-1 min-w-[120px] flex items-center justify-center gap-3 py-3 rounded-xl transition-all font-bold text-sm
                    ${platform === p ? 'bg-white/10 text-white shadow-xl border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <i className={`${PLATFORM_THEMES[p].icon} ${platform === p ? 'text-indigo-400' : ''}`}></i>
                  {p}
                </button>
              ))}
            </div>

            {seo ? (
              <div className="space-y-8 animate-in fade-in duration-700">
                {/* Viral Hooks */}
                <div className="grid grid-cols-1 gap-4">
                   <div className="flex items-center justify-between">
                     <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">Viral Hooks</h3>
                     <span className="text-[10px] text-slate-500">Algorithm Native for {platform}</span>
                   </div>
                   {seo.hooks.map((hook, i) => (
                     <div key={i} className="group relative bg-white/[0.03] border border-white/10 p-5 rounded-2xl hover:bg-white/[0.06] transition-all cursor-copy" onClick={() => copyToClipboard(hook.text, "Hook")}>
                       <div className="flex items-start justify-between mb-2">
                         <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Variation {i+1}</span>
                         <i className="fas fa-clone text-[10px] text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                       </div>
                       <p className="text-lg font-bold text-white mb-3 leading-tight leading-snug">"{hook.text}"</p>
                       <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-black/20 w-fit px-3 py-1 rounded-full border border-white/5">
                         <i className="fas fa-brain text-indigo-500 text-[10px]"></i>
                         {hook.explanation}
                       </div>
                     </div>
                   ))}
                </div>

                {/* SEO Metadata Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Optimized Title</label>
                        <div className="p-4 bg-black/40 rounded-xl border border-white/5 group relative cursor-pointer" onClick={() => copyToClipboard(seo.title, "Title")}>
                           <span className="text-sm font-bold text-white leading-tight block pr-6">{seo.title}</span>
                           <i className="fas fa-copy absolute top-4 right-4 text-xs text-slate-600 opacity-0 group-hover:opacity-100"></i>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Keywords</label>
                        <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex flex-wrap gap-1.5 h-full content-start overflow-y-auto max-h-[100px] custom-scrollbar">
                           {seo.keywords.map((k, idx) => (
                             <span key={idx} className="px-2 py-1 bg-white/5 text-[10px] rounded border border-white/5 text-slate-400">{k}</span>
                           ))}
                        </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Native Description</label>
                     <div className="p-6 bg-black/40 rounded-2xl border border-white/5 relative group cursor-pointer" onClick={() => copyToClipboard(seo.description, "Description")}>
                        <p className="text-sm text-slate-300 leading-relaxed max-h-[160px] overflow-y-auto custom-scrollbar pr-4">
                          {seo.description}
                        </p>
                        <i className="fas fa-copy absolute top-6 right-6 text-xs text-slate-600 opacity-0 group-hover:opacity-100"></i>
                     </div>
                   </div>

                   <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hashtags</label>
                       <button onClick={() => copyToClipboard(seo.hashtags.join(' '), "Hashtags")} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase">Copy All</button>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {seo.hashtags.map((h, idx) => (
                          <span key={idx} onClick={() => copyToClipboard(h, "Hashtag")} className="px-3 py-1.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 text-indigo-300 text-xs rounded-lg cursor-pointer transition-colors">
                            {h}
                          </span>
                        ))}
                     </div>
                   </div>
                </div>

                {/* Thumbnail Forge */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-pink-400">Thumbnail Studio</h3>
                    <div className="h-[1px] flex-1 mx-4 bg-white/5"></div>
                  </div>

                  {generatedThumbnail && (
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-500">
                      <img src={generatedThumbnail} alt="Generated" className="w-full aspect-video object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-pink-400 uppercase tracking-widest">Nano Banana Render</span>
                          <p className="text-xs text-slate-300 line-clamp-1 max-w-sm">{activePrompt}</p>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => copyToClipboard(activePrompt || '', "Prompt")} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all">
                             <i className="far fa-copy text-white"></i>
                           </button>
                           <a href={generatedThumbnail} download="thumbnail.png" className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center hover:bg-indigo-500 shadow-lg shadow-indigo-600/40 transition-all">
                             <i className="fas fa-download text-white"></i>
                           </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {genImgLoading && (
                    <div className="aspect-video bg-white/5 rounded-3xl flex flex-col items-center justify-center space-y-6 border border-white/10 animate-pulse relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent animate-shimmer"></div>
                       <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                       <div className="text-center">
                          <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Forging Aesthetic...</p>
                          <p className="text-[10px] text-slate-500 mt-2">NANO BANANA 2.5 INFUSION</p>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {thumbnailConcepts.map((concept, i) => (
                      <div key={i} className={`p-5 rounded-2xl border transition-all group flex flex-col ${activePrompt === concept.prompt ? 'border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/10' : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'}`}>
                        <div className="flex justify-between items-start mb-3">
                           <span className="px-2 py-0.5 bg-white/10 text-[9px] font-black uppercase tracking-widest rounded text-slate-300">{concept.style}</span>
                           <button onClick={() => copyToClipboard(concept.prompt, "Concept")} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-white transition-opacity"><i className="far fa-copy text-xs"></i></button>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed mb-4 flex-1">{concept.prompt}</p>
                        <button 
                          onClick={() => handleForgeThumbnail(concept.prompt)}
                          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-indigo-600 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all border border-white/10 hover:border-indigo-500 flex items-center justify-center gap-2"
                        >
                          <i className="fas fa-magic text-indigo-400 group-hover:text-white"></i> Forge Concept
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              !loadingStep.includes('analyzing') && !analysis && (
                <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-10 border border-white/5 rounded-[3rem] bg-white/[0.02]">
                   <div className="w-24 h-24 bg-indigo-500/5 rounded-[2rem] flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-transform duration-500">
                      <i className="fas fa-magic text-4xl text-indigo-400/50"></i>
                   </div>
                   <h2 className="text-3xl font-black text-white mb-4">Command Center</h2>
                   <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
                     Upload your media content to activate the forge. We'll generate a complete multi-platform strategy in seconds.
                   </p>
                </div>
              )
            )}
          </div>
        </div>
      </main>

      {/* Vault Modal Overlay */}
      {showVault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-xl" onClick={() => setShowVault(false)}></div>
           <div className="relative w-full max-w-3xl bg-slate-900 border border-white/10 rounded-[3rem] shadow-3xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-10 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-4">
                    <i className="fas fa-vault text-indigo-500"></i> Strategy Vault
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Access your previous viral generations.</p>
                </div>
                <button onClick={() => setShowVault(false)} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                  <i className="fas fa-times text-slate-400"></i>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-6">
                {history.length === 0 ? (
                  <div className="text-center py-20 opacity-30">
                    <i className="fas fa-folder-open text-6xl mb-6"></i>
                    <p className="font-bold uppercase tracking-widest text-xs">No records found</p>
                  </div>
                ) : (
                  history.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        setAnalysis(item.analysis);
                        setSeo(item.seo || null);
                        setThumbnailConcepts(item.thumbnailConcepts || []);
                        setPlatform(item.platform);
                        setShowVault(false);
                      }}
                      className="group bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${PLATFORM_THEMES[item.platform].color} text-white text-xs`}>
                             <i className={PLATFORM_THEMES[item.platform].icon}></i>
                           </span>
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                        <i className="fas fa-arrow-right text-indigo-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0"></i>
                      </div>
                      <h4 className="text-lg font-bold text-white mb-2 leading-tight pr-10">{item.seo?.title || 'Strategy Record'}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 italic">"{item.mediaSummary}"</p>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes scan {
          0% { top: 0; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
