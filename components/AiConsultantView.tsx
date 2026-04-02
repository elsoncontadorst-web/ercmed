import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2, Eraser, AlertTriangle, Shield, Paperclip, X, FileText, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
// Certifique-se de que estes imports estejam corretos
import { sendMessageToGroq, GroqMessage } from '../services/groq';
import { extractTextFromPDF } from '../services/pdfUtils';
import { generateCNISAnalysisPDF } from '../services/pdfGenerator';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
  attachmentName?: string;
}

// ----------------------------------------------------
// Base de Conhecimento do Consultor Clínico
// ----------------------------------------------------
const CLINICAL_KNOWLEDGE = `

--- BASE DE CONHECIMENTO CLÍNICO ---

## Sobre o Sistema EasyMed

O EasyMed é um sistema completo de gestão clínica que oferece:

### Módulos Principais:
1. **Gestão de Pacientes**: Cadastro completo, histórico médico, prontuário eletrônico
2. **Agendamento**: Sistema de agendamento online e presencial com confirmações automáticas
3. **Prontuário Eletrônico (EMR)**: Registro de consultas, anamnese, prescrições e atestados
4. **Gestão Financeira**: Controle de receitas, despesas, repasses e faturamento
5. **TISS/TUSS**: Geração de guias e arquivos para convênios
6. **Contratos**: Gestão de profissionais e seus repasses
7. **Relatórios**: Dashboards e relatórios gerenciais

### Como Usar o Sistema:
- **Cadastrar Paciente**: Vá em "Pacientes" > "Novo Paciente" e preencha os dados
- **Agendar Consulta**: Acesse "Agendamentos" > "Nova Consulta" e selecione paciente, profissional e horário
- **Criar Prontuário**: Durante ou após a consulta, acesse o prontuário do paciente em "EMR"
- **Emitir Receita**: No prontuário, use a seção "Prescrições" para adicionar medicamentos
- **Gerar Nota Fiscal**: Acesse "Faturamento" > "Notas Fiscais" após a consulta

### Estrutura de Receitas Médicas:
Uma receita médica deve conter:
1. Cabeçalho com dados do profissional (nome, CRM, especialidade)
2. Data da prescrição
3. Nome completo do paciente
4. Prescrição (Rp:)
   - Nome do medicamento
   - Concentração/dosagem
   - Forma farmacêutica
   - Quantidade
   - Posologia (como usar)
5. Assinatura e carimbo do profissional

### Corpo de Nota Fiscal para Serviços de Saúde:
Descrição sugerida para notas fiscais:
- "Consulta médica em [especialidade]"
- "Atendimento psicológico individual"
- "Sessão de fisioterapia"
- "Procedimento: [nome do procedimento]"
- "Consulta de retorno em [especialidade]"

--- FIM DA BASE DE CONHECIMENTO ---

`;
// ----------------------------------------------------
// Fim da Base de Conhecimento
// ----------------------------------------------------

const AiConsultantView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou seu consultor clínico IA. Posso ajudar você a redigir receitas médicas, criar textos para notas fiscais, orientar sobre como usar o sistema EasyMed e fornecer consultoria clínica. Como posso ajudar?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert('Apenas arquivos PDF são permitidos.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && !selectedFile) || isLoading) return;

    const userText = inputValue;
    const currentFile = selectedFile;

    // Limpa inputs imediatamente
    setInputValue('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsLoading(true);

    // Cria mensagem visual do usuário
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText || (currentFile ? `Analisar documento: ${currentFile.name}` : ''),
      attachmentName: currentFile?.name
    };

    // Adiciona a mensagem do usuário à UI (interface)
    setMessages(prev => [...prev, userMsg]);

    try {
      let finalContent = userText;

      // Se houver arquivo, extrai o texto e anexa ao prompt
      if (currentFile) {
        try {
          // A extração de texto do PDF é o processo mais demorado antes da chamada à IA
          const pdfText = await extractTextFromPDF(currentFile);
          // Adiciona a instrução e o conteúdo do PDF ao finalContent
          finalContent = `${userText}\n\n--- CONTEÚDO DO ARQUIVO ANEXADO (${currentFile.name}) ---\n${pdfText}\n\n--- FIM DO ARQUIVO ---`;
        } catch (err) {
          console.error("Erro ao ler PDF", err);
          throw new Error("Não foi possível ler o conteúdo do PDF. Verifique se o arquivo não está corrompido.");
        }
      }

      // 1. Cria o Prompt de Sistema com a Base de Conhecimento
      const systemPrompt: GroqMessage = {
        role: 'system',
        content: `Você é o "Consultor Clínico IA" do sistema EasyMed. Sua função é ajudar profissionais de saúde e gestores de clínicas com:
1. Redação de receitas médicas (estrutura, formato, orientações)
2. Criação de textos para corpo de notas fiscais de serviços de saúde
3. Orientações sobre como usar o sistema EasyMed
4. Consultoria clínica geral e boas práticas

Você deve usar a base de conhecimento abaixo para complementar suas respostas. Sempre seja claro, objetivo e profissional. Para questões médicas específicas, lembre que você é um assistente e não substitui a avaliação clínica do profissional.
          \n${CLINICAL_KNOWLEDGE}`
      };

      // 2. Prepara histórico para API (converte formato UI para formato API)
      const apiHistory: GroqMessage[] = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content // Nota: enviamos o conteúdo histórico "visível". Para contextos longos anteriores, o ideal seria armazenar o contexto completo separado, mas para chat curto funciona.
      }));

      // 3. Monta o histórico completo (System Prompt + Histórico Anterior + Mensagem Atual do Usuário)
      // O messages começa com o prompt de boas-vindas da IA. Vamos manter apenas as conversas do usuário e IA após o inicial.
      // Aqui, estamos assumindo que 'messages' tem 1 item (a mensagem de boas-vindas inicial) e o userMsg que acabamos de adicionar.
      // Para simplificar e garantir que o systemPrompt vá primeiro, usamos a lista de mensagens existente (messages)
      // e removemos a última mensagem do usuário (userMsg) que será substituída pelo 'finalContent'.
      const previousMessages = messages.slice(0, -1).map(m => ({
        role: m.role,
        content: m.content
      }));

      const fullApiHistory = [
        systemPrompt,
        ...previousMessages,
        { role: 'user' as const, content: finalContent }
      ];

      // 4. Chama Groq
      const aiResponse = await sendMessageToGroq(fullApiHistory);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message || 'Desculpe, encontrei um erro ao processar sua solicitação.',
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
    // Mantém apenas a mensagem inicial de boas-vindas da IA
    setMessages([messages[0]]);
    clearFile();
  };

  const exportAnalysisToPDF = () => {
    // Get all assistant messages (excluding the welcome message)
    const analysisMessages = messages
      .filter((msg, idx) => msg.role === 'assistant' && idx > 0)
      .map(msg => msg.content)
      .join('\n\n---\n\n');

    if (!analysisMessages) {
      alert('Não há análise para exportar. Envie um CNIS primeiro.');
      return;
    }

    const success = generateCNISAnalysisPDF(analysisMessages);
    if (success) {
      alert('PDF gerado com sucesso!');
    } else {
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 shadow-sm z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-6 h-6 text-brand-600" />
              Consultor Clínico IA
            </h2>
            <p className="text-sm text-slate-500">
              Assistente para receitas, notas fiscais, uso do sistema e consultoria clínica.
            </p>
          </div>
          <button
            onClick={exportAnalysisToPDF}
            disabled={messages.length <= 1}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] md:max-w-[75%] rounded-2xl p-4 shadow-sm animate-fade-in ${msg.role === 'user'
                ? 'bg-brand-600 text-white rounded-br-none'
                : msg.isError
                  ? 'bg-red-50 border border-red-200 text-red-800 rounded-bl-none'
                  : 'bg-white border border-gray-100 text-slate-700 rounded-bl-none'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 p-1.5 rounded-full flex-shrink-0 ${msg.role === 'user' ? 'bg-brand-500' : msg.isError ? 'bg-red-100' : 'bg-brand-50'
                  }`}>
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    msg.isError ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <Shield className="w-4 h-4 text-brand-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0 overflow-hidden">
                  {msg.attachmentName && (
                    <div className={`flex items-center gap-2 mb-2 p-2 rounded-lg text-xs font-medium ${msg.role === 'user' ? 'bg-brand-700 text-brand-100' : 'bg-gray-100 text-gray-600'
                      }`}>
                      <FileText className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">{msg.attachmentName}</span>
                    </div>
                  )}
                  <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'prose-headings:text-slate-800 prose-a:text-brand-600'}`}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-3">
              <div className="p-1.5 bg-brand-50 rounded-full">
                <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
              </div>
              <span className="text-sm text-gray-500">Analisando e processando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          {selectedFile && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-2 rounded-lg mb-2 text-sm text-blue-700 animate-fade-in">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="font-medium truncate max-w-[250px]">{selectedFile.name}</span>
              </div>
              <button onClick={clearFile} className="p-1 hover:bg-blue-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2 relative">
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
                placeholder={selectedFile ? "Adicione uma pergunta sobre o arquivo..." : "Como posso ajudar com receitas, notas fiscais ou uso do sistema?"}
                className="w-full pl-4 pr-24 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm"
                disabled={isLoading}
              />

              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  title="Anexar PDF"
                  className="p-2 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={isLoading || (!inputValue.trim() && !selectedFile)}
                  className="p-2 bg-brand-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            O assistente pode cometer erros. Para decisões clínicas importantes, sempre consulte um profissional qualificado.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AiConsultantView;