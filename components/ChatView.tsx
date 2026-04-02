import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, ExternalLink, AlertTriangle, Eraser } from 'lucide-react';
import { Message } from '../types';
import { sendMessageToGemini } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      content: 'Olá! Sou seu assistente de planejamento tributário. \n\nPosso ajudar com:\n- Comparação MEI x Simples x Presumido\n- Identificação de CNAEs\n- Cálculo de Fator R\n- Dúvidas sobre legislação (LC 123/2006)\n\nQual é a sua dúvida hoje?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      const response = await sendMessageToGemini(userMsg.content, history);

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text,
        timestamp: new Date(),
        sources: response.sources
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: 'Desculpe, encontrei um erro ao processar sua solicitação. Tente novamente mais tarde.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([messages[0]]);
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] md:max-w-[75%] rounded-2xl p-4 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-none'
                  : msg.isError
                  ? 'bg-red-50 border border-red-200 text-red-800 rounded-bl-none'
                  : 'bg-white border border-gray-100 text-slate-700 rounded-bl-none'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 p-1.5 rounded-full flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-brand-500' : msg.isError ? 'bg-red-100' : 'bg-brand-50'
                }`}>
                    {msg.role === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                    ) : (
                        msg.isError ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <Bot className="w-4 h-4 text-brand-600" />
                    )}
                </div>
                
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-100/20">
                            <p className="text-xs font-semibold mb-2 opacity-80 flex items-center">
                                <ExternalLink className="w-3 h-3 mr-1" /> Fontes verificadas:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {msg.sources.map((source, idx) => (
                                    <a 
                                        key={idx} 
                                        href={source.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={`text-xs px-2 py-1 rounded transition-colors truncate max-w-[200px] ${
                                            msg.role === 'user' 
                                            ? 'bg-brand-700 hover:bg-brand-800 text-brand-100' 
                                            : 'bg-gray-100 hover:bg-gray-200 text-brand-700'
                                        }`}
                                    >
                                        {source.title}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-3">
                <div className="p-1.5 bg-brand-50 rounded-full">
                    <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
                </div>
                <span className="text-sm text-gray-500">Analisando legislação e tabelas...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto relative flex gap-2">
            <button
                onClick={clearChat}
                title="Limpar conversa"
                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
                <Eraser className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex: Qual anexo do Simples para desenvolvimento de software?"
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm"
                    disabled={isLoading}
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading || !inputValue.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700 transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
            Simulações são estimativas. Consulte sempre um contador humano para decisões finais.
        </p>
      </div>
    </div>
  );
};

export default ChatView;