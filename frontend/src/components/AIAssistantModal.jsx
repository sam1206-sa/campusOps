import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, Bot, AlertTriangle, Lightbulb } from 'lucide-react';
import { api } from '../services/api';

const AIAssistantModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your Smart Schedule Assistant. Ask me anything about your timetable, upcoming exams, assignment deadlines, or type "conflict" to check for schedule overlaps.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const suggestions = [
    { text: "When is my next class?", icon: Bot },
    { text: "Suggest free slots", icon: Lightbulb },
    { text: "Show assignments", icon: Sparkles },
    { text: "Check timetable conflicts", icon: AlertTriangle }
  ];

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text }]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const response = await api.aiChat(text);
      setMessages(prev => [...prev, { sender: 'bot', text: response.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: "Sorry, I couldn't reach the AI scheduler server right now." }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 z-40 flex items-center justify-center border border-blue-500/30 group"
      >
        <Sparkles className="w-6 h-6 animate-pulse group-hover:scale-110 transition-transform" />
      </button>

      {/* Slide-in Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] rounded-2xl glass-panel shadow-2xl flex flex-col z-50 overflow-hidden border border-white/20"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm">Schedule Assistant AI</h3>
                  <span className="text-[10px] text-blue-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span>
                    Online Timetable Engine
                  </span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      m.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-100 dark:border-slate-700/50'
                    }`}
                  >
                    {/* Render basic markdown bold text if present */}
                    {m.text.split('\n').map((line, lIdx) => (
                      <p key={lIdx} className={line.trim() === '' ? 'h-2' : 'mb-1 leading-relaxed'}>
                        {line.split('**').map((part, pIdx) => 
                          pIdx % 2 === 1 ? <strong key={pIdx} className="text-blue-500 dark:text-blue-300 font-semibold">{part}</strong> : part
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-100 dark:border-slate-700/50 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestion Chips */}
            {messages.length === 1 && (
              <div className="px-4 py-2 grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s.text)}
                    className="flex items-center gap-1.5 p-2 text-[11px] text-left text-slate-600 dark:text-slate-350 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 transition-all font-medium"
                  >
                    <s.icon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{s.text}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Footer Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 items-center bg-white dark:bg-slate-900"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about timetable, conflicts..."
                className="flex-1 px-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistantModal;
