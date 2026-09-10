import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Sparkles } from 'lucide-react';

const WELCOME = "Bonjour ! Je suis le Conseiller IA d'OrientGuinée. Je peux vous aider sur l'orientation, les universités, les filières, les métiers — ou n'importe quelle autre question. Comment puis-je vous aider ?";

const Chatbot = () => {
  const [isOpen,    setIsOpen]    = useState(false);
  const [messages,  setMessages]  = useState([{ text: WELCOME, isBot: true }]);
  const [history,   setHistory]   = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping,  setIsTyping]  = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener('open-chatbot', open);
    return () => window.removeEventListener('open-chatbot', open);
  }, []);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    // Ajoute le message utilisateur à l'affichage
    setMessages((prev) => [...prev, { text, isBot: false }]);
    setInputText('');
    setIsTyping(true);

    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${API}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      const reply = data.reply || "Désolé, je n'ai pas pu générer de réponse.";

      setMessages((prev) => [...prev, { text: reply, isBot: true }]);

      // Met à jour l'historique Gemini (format attendu par l'API)
      setHistory((prev) => [
        ...prev,
        { role: 'user',  parts: [{ text }] },
        { role: 'model', parts: [{ text: reply }] },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { text: 'Erreur de connexion au serveur IA. Vérifiez que le backend est démarré.', isBot: true },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ===== Bouton flottant ===== */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chatbot-pulse fixed bottom-6 right-6 h-14 w-14 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-primary-700 hover:scale-105 transition-all z-50"
          aria-label="Ouvrir le conseiller IA"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* ===== Fenêtre de chat ===== */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-8">
          <div className="bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 w-full max-w-2xl h-[85vh]">

            {/* En-tête */}
            <div className="bg-gradient-to-r from-primary-700 to-primary-500 px-6 py-4 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white leading-tight">Conseiller IA</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-primary-100 text-xs">Propulsé par Gemini · Disponible 24h/24</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-5 overflow-y-auto bg-slate-50 flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${msg.isBot ? 'self-start' : 'self-end flex-row-reverse'} max-w-[85%]`}
                >
                  {/* Avatar bot */}
                  {msg.isBot && (
                    <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.isBot
                        ? 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                        : 'bg-primary-600 text-white rounded-tr-none'
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}

              {/* Indicateur de frappe */}
              {isTyping && (
                <div className="flex gap-2.5 self-start max-w-[85%]">
                  <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                    <div className="flex gap-1 items-center h-4">
                      <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Saisie */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex-shrink-0">
              <form
                className="flex gap-3 items-center"
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez n'importe quelle question…"
                  disabled={isTyping}
                  className="flex-1 px-5 py-3.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-slate-50 transition disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  className="h-12 w-12 bg-primary-600 text-white rounded-2xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm flex-shrink-0"
                >
                  <Send className="h-5 w-5 ml-0.5" />
                </button>
              </form>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Propulsé par Google Gemini · OrientGuinée
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
