'use client';

import { useState } from 'react';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';

interface TutorialTopic {
  id: string;
  category: string;
  icon: string;
  title: string;
  description: string;
  duration: string;
}

const TUTORIALS: TutorialTopic[] = [
  {
    id: '1',
    category: 'Primeiros passos',
    icon: '🚀',
    title: 'Visão Geral da Fikra e Central Operacional',
    description: 'Como funciona sua rotina diária no painel Início, agenda do dia e radar de pendências.',
    duration: '3 min',
  },
  {
    id: '2',
    category: 'Alunos e turmas',
    icon: '👥',
    title: 'Cadastro e Organização de Alunos e Turmas',
    description: 'Como matricular alunos com ou sem e-mail, criar turmas e acompanhar fichas individuais.',
    duration: '4 min',
  },
  {
    id: '3',
    category: 'Agenda e Google Agenda',
    icon: '📅',
    title: 'Agendamento de Aulas e Conexão com Google Agenda',
    description: 'Sincronização bidirecional, criação de links de videochamada e gerenciamento de horários.',
    duration: '5 min',
  },
  {
    id: '4',
    category: 'Materiais didáticos',
    icon: '📚',
    title: 'Organização de Níveis, Unidades e Aulas',
    description: 'Estruturação do currículo, objetivos comunicativos, regras gramaticais e upload de materiais.',
    duration: '6 min',
  },
  {
    id: '5',
    category: 'Banco de atividades',
    icon: '🧩',
    title: 'Construtor de Atividades por Blocos e os 14 Formatos',
    description: 'Como montar exercícios objetivos e dissertativos, intercalar recursos de apoio e definir quebras de página.',
    duration: '7 min',
  },
  {
    id: '6',
    category: 'Atividades e correções',
    icon: '📝',
    title: 'Mecanismo de Correção Mista e Envio de Feedback',
    description: 'Avaliação de respostas dissertativas, aprovação de produções livres e gabarito automático.',
    duration: '4 min',
  },
  {
    id: '7',
    category: 'Caderno compartilhado e registros',
    icon: '✍️',
    title: 'Caderno de Anotações e Modo Apresentação de Aula',
    description: 'Anotações colaborativas com o aluno, registros privados pós-aula e modo aula para compartilhamento de tela.',
    duration: '5 min',
  },
  {
    id: '8',
    category: 'Financeiro',
    icon: '💳',
    title: 'Gestão de Mensalidades, Despesas e Relatórios',
    description: 'Controle de recebimentos, fluxo de caixa, conciliação e exportação de dados contábeis.',
    duration: '5 min',
  },
  {
    id: '9',
    category: 'Conta e equipe',
    icon: '🏫',
    title: 'Dados da Escola, Professores Parceiros e Repasses',
    description: 'Configuração da instituição, convites para outros docentes e modelos de remuneração.',
    duration: '4 min',
  },
];

const CATEGORIES = [
  'Todos',
  'Primeiros passos',
  'Alunos e turmas',
  'Agenda e Google Agenda',
  'Materiais didáticos',
  'Banco de atividades',
  'Atividades e correções',
  'Caderno compartilhado e registros',
  'Financeiro',
  'Conta e equipe',
];

export default function TeacherTutorialsPage() {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [selectedTutorial, setSelectedTutorial] = useState<TutorialTopic | null>(null);

  const filteredTutorials = TUTORIALS.filter((t) => {
    if (selectedCategory !== 'Todos' && t.category !== selectedCategory) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Central de Ajuda & Tutoriais"
        description="Guias passo a passo e respostas rápidas para você aproveitar ao máximo todos os recursos da Fikra."
      />

      {/* Barra de Busca e Filtro de Categorias */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#6F6865]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Qual funcionalidade ou dúvida você deseja consultar? (Ex: Google Agenda, Correção, Caderno...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#D7CE36]"
          />
        </div>

        {/* Pílulas de Categorias */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E6E1D8]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#6C0F37] text-[#FFFDF7] shadow-xs'
                  : 'bg-[#FAF8F5] text-[#6F6865] hover:text-[#2B2426] hover:bg-[#F0EBE1] border border-[#E6E1D8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grade de Artigos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTutorials.map((guide) => (
          <Card
            key={guide.id}
            className="p-5 flex flex-col justify-between hover:border-[#6C0F37]/50 hover:shadow-md transition-all space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{guide.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#FAF8F5] text-[#6C0F37] rounded border border-[#E6E1D8]">
                  {guide.category}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#2B2426] leading-snug">
                {guide.title}
              </h3>
              <p className="text-xs text-[#6F6865] line-clamp-3 leading-relaxed">
                {guide.description}
              </p>
            </div>

            <div className="pt-3 border-t border-[#E6E1D8] flex items-center justify-between text-xs">
              <span className="text-[#6F6865] text-[11px] font-medium">⏱️ {guide.duration}</span>
              <button
                type="button"
                onClick={() => setSelectedTutorial(guide)}
                className="font-bold text-[#6C0F37] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Ler guia</span>
                <span>→</span>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Card de Contato / Suporte Humano no Rodapé */}
      <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] px-2.5 py-0.5 rounded">
            Suporte Especializado
          </span>
          <h3 className="text-xl font-bold text-[#2B2426]">Não encontrou o que precisava?</h3>
          <p className="text-xs text-[#6F6865] max-w-xl">
            Nossa equipe de suporte pedagógico e técnico está pronta para ajudar você a configurar turmas, materiais e rotinas de ensino.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          <a
            href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20a%20plataforma%20Fikra"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] transition-colors shadow-xs"
          >
            <span>💬</span>
            <span>Falar pelo WhatsApp</span>
          </a>

          <a
            href="mailto:suporte@fikra.com.br"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2B2426] bg-white border border-[#E6E1D8] hover:bg-[#FAF8F5] transition-colors shadow-xs"
          >
            <span>✉️</span>
            <span>Enviar e-mail</span>
          </a>
        </div>
      </div>

      {/* Modal Leitor de Tutorial */}
      {selectedTutorial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTutorial(null);
          }}
        >
          <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl w-full max-w-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E6E1D8] pb-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] px-2 py-0.5 rounded">
                  {selectedTutorial.category}
                </span>
                <h3 className="text-lg font-bold text-[#2B2426]">{selectedTutorial.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTutorial(null)}
                className="text-[#6F6865] hover:text-[#2B2426] p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-[#2B2426] leading-relaxed space-y-3 p-4 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8]">
              <p className="font-semibold text-sm text-[#6C0F37]">{selectedTutorial.description}</p>
              <p>
                Este recurso foi projetado na plataforma Fikra para dar total autonomia ao professor, unificando cronogramas, dados pedagógicos e gestão em um único ecossistema.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[#6F6865]">
                <li>Acesse o menu correspondente na barra superior de navegação.</li>
                <li>Utilize o botão principal de criação ou o menu suspenso ⚡ Acesso rápido.</li>
                <li>Qualquer dúvida técnica pode ser esclarecida via WhatsApp com nossa equipe.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedTutorial(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}