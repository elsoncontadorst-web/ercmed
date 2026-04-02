import React from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface LGPDConsentProps {
    onAccept: () => void;
    onDecline: () => void;
}

const LGPDConsent: React.FC<LGPDConsentProps> = ({ onAccept, onDecline }) => {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white p-6 rounded-t-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="w-8 h-8" />
                        <h2 className="text-2xl font-bold">Termos de Uso e Política de Privacidade</h2>
                    </div>
                    <p className="text-blue-100 text-sm">
                        Conforme a Lei Geral de Proteção de Dados – LGPD (Lei 13.709/2018)
                    </p>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5">

                    {/* 1. Dados Coletados */}
                    <section className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
                        <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                            📋 1. Dados Coletados
                        </h3>
                        <p className="text-sm text-blue-800 mb-2">
                            Coletamos e processamos apenas os dados estritamente necessários para o funcionamento da plataforma, incluindo:
                        </p>
                        <ul className="text-sm text-blue-800 space-y-1 ml-4">
                            <li>• <strong>Nome, e-mail e CPF</strong></li>
                            <li>• Dados administrativos vinculados à clínica e profissionais</li>
                            <li>• Informações de saúde inseridas voluntariamente (prontuários, anamneses e registros clínicos)</li>
                        </ul>
                        <p className="text-sm text-blue-900 font-semibold mt-2">
                            Não coletamos dados além do necessário.
                        </p>
                    </section>

                    {/* 2. Finalidade */}
                    <section className="bg-green-50 border-l-4 border-green-600 p-4 rounded-r-lg">
                        <h3 className="font-bold text-green-900 mb-2">
                            🎯 2. Finalidade do Tratamento de Dados
                        </h3>
                        <p className="text-sm text-green-800 mb-2">
                            Os dados são utilizados exclusivamente para:
                        </p>
                        <ul className="text-sm text-green-800 space-y-1 ml-4">
                            <li>• Gestão de consultas</li>
                            <li>• Manutenção de prontuários eletrônicos</li>
                            <li>• Processos de faturamento e repasses</li>
                            <li>• Geração de relatórios operacionais</li>
                        </ul>
                        <p className="text-sm text-green-900 font-semibold mt-2">
                            Não utilizamos dados para publicidade, venda, compartilhamento externo ou qualquer uso não autorizado.
                        </p>
                    </section>

                    {/* 3. Segurança */}
                    <section className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-lg">
                        <h3 className="font-bold text-purple-900 mb-2">
                            🔒 3. Segurança e Armazenamento
                        </h3>
                        <p className="text-sm text-purple-800 mb-2">
                            Adotamos práticas rígidas de segurança da informação, incluindo:
                        </p>
                        <ul className="text-sm text-purple-800 space-y-1 ml-4">
                            <li>• Criptografia</li>
                            <li>• Autenticação segura</li>
                            <li>• Acesso restrito por permissão</li>
                            <li>• Backups e monitoramento contínuo</li>
                            <li>• Políticas internas de sigilo e conformidade</li>
                        </ul>
                        <p className="text-sm text-purple-800 mt-2">
                            Os dados são armazenados em provedores seguros que seguem padrões internacionais.
                            <strong> Nenhuma informação é compartilhada com terceiros sem base legal ou autorização expressa.</strong>
                        </p>
                    </section>

                    {/* 4. Seus Direitos */}
                    <section className="bg-orange-50 border-l-4 border-orange-600 p-4 rounded-r-lg">
                        <h3 className="font-bold text-orange-900 mb-2">
                            ✅ 4. Seus Direitos (LGPD)
                        </h3>
                        <p className="text-sm text-orange-800 mb-2">O usuário pode:</p>
                        <ul className="text-sm text-orange-800 space-y-1 ml-4">
                            <li>• Acessar seus dados pessoais</li>
                            <li>• Solicitar correção de informações incorretas</li>
                            <li>• Solicitar exclusão de seus dados</li>
                            <li>• Revogar o consentimento a qualquer momento</li>
                        </ul>
                        <div className="mt-3 bg-orange-100 p-3 rounded border border-orange-300">
                            <p className="text-xs text-orange-900 font-bold flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>
                                    <strong>Importante:</strong> Por motivos de segurança, privacidade e arquitetura do sistema,
                                    os dados não são exportáveis e não podem ser transferidos para fora da plataforma, exceto quando exigido por obrigação legal.
                                </span>
                            </p>
                            <p className="text-xs text-orange-800 mt-2 ml-6">
                                Os dados ficam exclusivamente dentro do sistema, protegidos e inacessíveis a terceiros.
                                Um canal interno de suporte está disponível para solicitações relacionadas à privacidade.
                            </p>
                        </div>
                    </section>

                    {/* 5. Consentimento */}
                    <section className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded-r-lg">
                        <h3 className="font-bold text-yellow-900 mb-2">
                            ⚠️ 5. Consentimento
                        </h3>
                        <p className="text-sm text-yellow-900 mb-2">
                            Ao clicar em <strong>"Aceito e Continuar"</strong>, você confirma que:
                        </p>
                        <ul className="text-sm text-yellow-800 space-y-1 ml-4">
                            <li>• Leu e concorda com este Termo de Uso e Política de Privacidade</li>
                            <li>• Autoriza o tratamento dos seus dados conforme as finalidades descritas</li>
                            <li>• Compreende que determinadas funcionalidades dependem das informações fornecidas</li>
                            <li>• Está ciente de que os dados ficam exclusivamente na plataforma, sem exportação permitida</li>
                        </ul>
                        <p className="text-sm text-yellow-900 font-semibold mt-2">
                            Caso não concorde, utilize "Não Aceito", o que poderá limitar o uso dos serviços.
                        </p>
                    </section>

                    {/* 6. Disclaimer Legal */}
                    <section className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg">
                        <h3 className="font-bold text-red-900 mb-2">
                            📄 6. Disclaimer Legal
                        </h3>
                        <ul className="text-xs text-red-800 space-y-2">
                            <li>• A plataforma é uma ferramenta tecnológica de gestão e não substitui diagnósticos, condutas ou orientações clínicas.</li>
                            <li>• A responsabilidade pela veracidade das informações inseridas é totalmente do usuário ou profissional.</li>
                            <li>• A plataforma não interfere, altera ou valida informações clínicas registradas pelos profissionais.</li>
                            <li>• O usuário deve manter seus dados de acesso em sigilo, sendo responsável pelo uso inadequado.</li>
                            <li>• É proibido o compartilhamento de dados sensíveis com terceiros sem base legal.</li>
                            <li>• Os dados ficam apenas dentro da plataforma, sem possibilidade de exportação ou fornecimento externo, salvo determinação legal.</li>
                        </ul>
                    </section>

                    {/* 7. Atualizações */}
                    <section className="bg-gray-100 border-l-4 border-gray-600 p-4 rounded-r-lg">
                        <h3 className="font-bold text-gray-900 mb-2">
                            📌 7. Atualizações
                        </h3>
                        <p className="text-sm text-gray-800">
                            Este documento pode ser atualizado periodicamente. A versão mais recente estará sempre disponível na plataforma.
                        </p>
                    </section>

                    {/* Contact Info */}
                    <div className="text-center text-xs text-gray-600 pt-2">
                        Para exercer seus direitos ou tirar dúvidas, entre em contato: <strong>elsoncontador.st@gmail.com</strong>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-gray-50 rounded-b-2xl flex gap-3 border-t">
                    <button
                        onClick={onDecline}
                        className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        <XCircle className="w-5 h-5" />
                        Não Aceito
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-colors font-bold flex items-center justify-center gap-2 shadow-lg"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Aceito e Continuar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LGPDConsent;
