'use client';

import { useState, useMemo } from 'react';
import { CreateActivityModal } from './CreateActivityModal';
import { ActivityCardMenu } from './ActivityCardMenu';
import { ActivityPreviewModal } from './activities/ActivityPreviewModal';
import { renderInlineMarkdown } from './PaginatedContent';
import { bulkAssignActivitiesAction } from '../actions/activities';

interface ActivityItem {
  id: string;
  title: string;
  type: string;
  description?: string | null;
  content_markdown?: string | null;
  pdf_url?: string | null;
  video_url?: string | null;
  link_url?: string | null;
  audio_url?: string | null;
  metadata?: any;
  lessons?: {
    id: string;
    title: string;
    modules?: {
      id: string;
      title: string;
      tracks?: {
        id: string;
        title: string;
      } | null;
    } | null;
  } | null;
}

interface ActivityBankClientProps {
  initialActivities: ActivityItem[];
  tracks: any[];
  students: { id: string; full_name: string }[];
  classes: { id: string; name: string }[];
  organizationId?: string;
}

export function ActivityBankClient({
  initialActivities,
  tracks,
  students,
  classes,
  organizationId,
}: ActivityBankClientProps) {
  const [search, setSearch] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('all'); // 'all' | 'general' | track.id
  const [categoryFilter, setCategoryFilter] = useState('');
  const [correctionFilter, setCorrectionFilter] = useState('all');
  const [previewActivity, setPreviewActivity] = useState<ActivityItem | null>(null);

  // REQUISITO 1: Edição Completa de Atividades via Construtor Completo
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);

  // REQUISITO 3: Seleção Múltipla via Checkboxes e Atribuição em Lote
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);

  // Mapeamento e contagens de níveis
  const trackStats = useMemo(() => {
    const stats: Record<string, { activityCount: number; lessonCount: number }> = {};

    tracks.forEach((trk) => {
      let lCount = 0;
      (trk.modules || []).forEach((m: any) => {
        lCount += (m.lessons || []).length;
      });

      const actCount = initialActivities.filter((act) => {
        const actTrackId = act.lessons?.modules?.tracks?.id || act.metadata?.track_id;
        return actTrackId === trk.id;
      }).length;

      stats[trk.id] = { activityCount: actCount, lessonCount: lCount };
    });

    const generalCount = initialActivities.filter(
      (act) => !act.lessons?.modules?.tracks?.id && !act.metadata?.track_id
    ).length;

    return { tracks: stats, generalCount, totalCount: initialActivities.length };
  }, [tracks, initialActivities]);

  // Filtra as atividades na memória em tempo real
  const filteredActivities = useMemo(() => {
    return initialActivities.filter((act) => {
      // 1. Busca por texto
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = act.title.toLowerCase().includes(query);
        const matchesDesc = (act.content_markdown || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // 2. Filtro pelo Cartão / Aba de Nível selecionado
      if (selectedTrackId === 'general') {
        const hasTrack = act.lessons?.modules?.tracks?.id || act.metadata?.track_id;
        if (hasTrack) return false;
      } else if (selectedTrackId !== 'all') {
        const actTrackId = act.lessons?.modules?.tracks?.id || act.metadata?.track_id;
        if (actTrackId !== selectedTrackId) return false;
      }

      // 3. Filtro por categoria / objetivo
      if (categoryFilter) {
        const cat = act.metadata?.category || act.type;
        if (cat !== categoryFilter) return false;
      }

      // 4. Filtro por formato de correção
      if (correctionFilter !== 'all') {
        const isExternal =
          act.metadata?.no_correction_needed ||
          act.metadata?.external_correction ||
          act.metadata?.correction_type === 'external';

        if (correctionFilter === 'external') {
          if (!isExternal) return false;
        } else {
          if (isExternal) return false;
          const corrType = act.metadata?.correction_type || 'manual';
          if (corrType !== correctionFilter) return false;
        }
      }

      return true;
    });
  }, [initialActivities, search, selectedTrackId, categoryFilter, correctionFilter]);

  // Funções de Seleção em Lote
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredActivities.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredActivities.map((a) => a.id));
    }
  };

  const handleBulkAssignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBulkAssignLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      selectedIds.forEach((id) => formData.append('activity_ids', id));
      const res = await bulkAssignActivitiesAction(formData);

      if (res.success) {
        setIsBulkAssignOpen(false);
        setSelectedIds([]);
        alert(`${res.count} atividades atribuídas com sucesso!`);
      } else {
        alert(res.error || 'Erro ao atribuir atividades em lote.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro inesperado ao atribuir atividades.');
    } finally {
      setBulkAssignLoading(false);
    }
  };

  // Agrupamento por aula quando um nível específico está ativo
  const groupedByLesson = useMemo(() => {
    if (selectedTrackId === 'all' || selectedTrackId === 'general') return null;

    const currentTrack = tracks.find((t) => t.id === selectedTrackId);
    if (!currentTrack) return null;

    const lessonMap: Record<string, { lesson: any; activities: ActivityItem[] }> = {};
    const moduleList = currentTrack.modules || [];

    moduleList.forEach((mod: any) => {
      (mod.lessons || []).forEach((l: any) => {
        lessonMap[l.id] = {
          lesson: { ...l, moduleTitle: mod.title },
          activities: [],
        };
      });
    });

    const unassignedActivities: ActivityItem[] = [];

    filteredActivities.forEach((act) => {
      const lId = act.lessons?.id;
      if (lId && lessonMap[lId]) {
        lessonMap[lId].activities.push(act);
      } else {
        unassignedActivities.push(act);
      }
    });

    return {
      lessonsWithActs: Object.values(lessonMap),
      unassignedActivities,
    };
  }, [selectedTrackId, tracks, filteredActivities]);

  // Lista única de categorias para o filtro
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    initialActivities.forEach((a) => {
      if (a.metadata?.category) set.add(a.metadata.category);
      else set.add(a.type);
    });
    return Array.from(set);
  }, [initialActivities]);

  // Renderizador de um Card de Atividade Individual com Checkbox de Seleção em Lote
  const renderActivityCard = (act: ActivityItem) => {
    const meta = act.metadata || {};
    const itemsCount = meta.item_count ?? (meta.items?.length || 0);
    const resourcesCount =
      meta.resource_count ??
      ((meta.resources?.length || 0) +
        (act.pdf_url || act.video_url || act.link_url || act.audio_url ? 1 : 0));

    const manualTypes = ['short_answer_manual', 'long_answer_manual', 'open_production_manual'];
    const manualCount =
      meta.manual_count ??
      (meta.items?.filter((q: any) => manualTypes.includes(q.type)).length || 0);
    const autoCount = meta.auto_count ?? Math.max(0, itemsCount - manualCount);

    const isExternalCorrection =
      meta.no_correction_needed ||
      meta.external_correction ||
      meta.correction_type === 'external';

    const correctionType =
      meta.correction_type || (itemsCount > 0 && manualCount === 0 ? 'auto' : 'manual');
    const targetSkills: string[] = meta.target_skills || [];

    const trackName = act.lessons?.modules?.tracks?.title;
    const moduleName = act.lessons?.modules?.title;
    const lessonName = act.lessons?.title;
    const curricularPath = trackName
      ? `${trackName} • ${moduleName || ''} • ${lessonName || ''}`
      : lessonName
      ? `Aula: ${lessonName}`
      : 'Atividade Geral';

    const isSelected = selectedIds.includes(act.id);

    return (
      <div
        key={act.id}
        className={`bg-white border rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] hover:border-[#6C0F37]/50 hover:shadow-md transition-all flex flex-col justify-between gap-4 ${
          isSelected ? 'border-[#6C0F37] ring-2 ring-[#6C0F37]/20 bg-[#FAF8F5]/40' : 'border-[#E6E1D8]'
        }`}
      >
        <div className="space-y-3">
          {/* Topo do Card: Checkbox + Categoria, Correção e Menu de Ações */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              {/* REQUISITO 3: Checkbox individual para atribuição em lote */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(act.id)}
                className="w-4 h-4 text-[#6C0F37] border-[#E6E1D8] rounded focus:ring-[#6C0F37] mt-0.5 cursor-pointer accent-[#6C0F37] shrink-0"
                title="Selecionar para atribuição em lote"
              />

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Badge de Objetivo Geral */}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#F7F4ED] px-2 py-0.5 rounded border border-[#E6E1D8]">
                    {meta.category || act.type}
                  </span>

                  {/* Badge de Status de Correção (com suporte a Correção Externa) */}
                  {isExternalCorrection ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-blue-50 text-blue-800 border-blue-200">
                      🌐 Externa / Sem pendência
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        correctionType === 'auto'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : correctionType === 'mixed'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {correctionType === 'auto'
                        ? '⚡ Automática'
                        : correctionType === 'mixed'
                        ? '🔀 Mista'
                        : '✍️ Manual'}
                    </span>
                  )}
                </div>

                {/* Badges Secundárias das Habilidades Trabalhadas */}
                {targetSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {targetSkills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="text-[9.5px] font-medium bg-[#FAF8F5] text-[#6F6865] px-1.5 py-0.5 rounded border border-[#E6E1D8]"
                      >
                        {skill}
                      </span>
                    ))}
                    {targetSkills.length > 3 && (
                      <span className="text-[9.5px] text-[#6F6865] font-semibold self-center">
                        +{targetSkills.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <p
                  className="text-[11px] text-[#6F6865] font-medium truncate pt-0.5"
                  title={curricularPath}
                >
                  {curricularPath}
                </p>
              </div>
            </div>

            {/* Menu de Ações com Edição Completa Integrada */}
            <ActivityCardMenu
              activity={act}
              students={students}
              classes={classes}
              tracks={tracks}
              onEdit={(activityToEdit) => setEditingActivity(activityToEdit)}
            />
          </div>

          {/* Título da Atividade */}
          <h3 className="text-base font-bold text-[#2B2426] line-clamp-2 leading-snug">
            {act.title}
          </h3>

          {act.content_markdown && (
            <p className="text-xs text-[#6F6865] line-clamp-2 leading-relaxed">
              {renderInlineMarkdown(
                act.content_markdown
                  .replace(/<!--page-break-->/gi, ' ')
                  .replace(/(?:^|\n)\s*#{1,3}\s+/g, ' ')
                  .replace(/(?:^|\n)\s*[-*]\s*\[[ xX]?\]\s+/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
              )}
            </p>
          )}
        </div>

        {/* Rodapé do Card com Resumo de Blocos e Botão Visualizar */}
        <div className="pt-3 border-t border-[#E6E1D8] flex flex-col gap-2 text-xs">
          <div className="text-[#6F6865] text-[11px] leading-tight">
            <span className="font-semibold text-[#2B2426]">
              {itemsCount} {itemsCount === 1 ? 'questão' : 'questões'}
            </span>{' '}
            {itemsCount > 0 && !isExternalCorrection && (
              <span>
                ({autoCount} auto, {manualCount} manual)
              </span>
            )}{' '}
            •{' '}
            <span>
              {resourcesCount} {resourcesCount === 1 ? 'mídia' : 'mídias'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setPreviewActivity(act)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6C0F37] hover:underline cursor-pointer"
            >
              <span>👁️ Visualizar atividade</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* REQUISITO 3: Barra Flutuante de Ação em Lote */}
      {selectedIds.length > 0 && (
        <div className="bg-[#6C0F37] text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <span className="bg-[#D7CE36] text-[#6C0F37] font-bold text-xs px-2.5 py-1 rounded-xl shadow-xs">
              {selectedIds.length} {selectedIds.length === 1 ? 'selecionada' : 'selecionadas'}
            </span>
            <span className="text-xs font-semibold">
              Atividades selecionadas para atribuição coletiva a alunos ou turmas.
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              Limpar seleção
            </button>
            <button
              type="button"
              onClick={() => setIsBulkAssignOpen(true)}
              className="px-4 py-2 bg-[#D7CE36] hover:bg-[#C2B92F] text-[#6C0F37] font-bold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>🎯</span>
              <span>Atribuir selecionadas ao aluno</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Busca + Botão Nova Atividade */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl p-4 sm:p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#6F6865]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar por nome da atividade, enunciado ou tema..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition bg-white"
            />
          </div>

          {/* Botão de Destaque no Topo */}
          <div className="shrink-0">
            <CreateActivityModal
              tracks={tracks}
              triggerText="+ Nova atividade"
              organizationId={organizationId}
            />
          </div>
        </div>

        {/* Filtros Auxiliares + Checkbox Selecionar Todas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E6E1D8] items-end">
          {/* Filtro por Categoria / Objetivo */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
              Tipo / Objetivo Pedagógico
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
            >
              <option value="">Todas as Categorias</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Formato de Correção */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
              Formato de Correção
            </label>
            <select
              value={correctionFilter}
              onChange={(e) => setCorrectionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
            >
              <option value="all">Todos os Formatos</option>
              <option value="auto">Automática (Gabarito)</option>
              <option value="manual">Manual (Pela Equipe Docente)</option>
              <option value="mixed">Mista</option>
              <option value="external">Correção Externa / Sem Pendência</option>
            </select>
          </div>

          {/* Checkbox de Selecionar Todas as Visíveis */}
          <div className="pb-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] cursor-pointer">
              <input
                type="checkbox"
                checked={
                  filteredActivities.length > 0 &&
                  selectedIds.length === filteredActivities.length
                }
                onChange={handleSelectAll}
                className="w-4 h-4 text-[#6C0F37] border-[#E6E1D8] rounded focus:ring-[#6C0F37] accent-[#6C0F37] cursor-pointer"
              />
              <span>Selecionar todas as visíveis ({filteredActivities.length})</span>
            </label>
          </div>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL: CARTÕES DOS NÍVEIS DIDÁTICOS CADASTRADOS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-2">
            <span>🎯 Níveis Didáticos Cadastrados</span>
            <span className="text-[11px] text-[#6F6865] font-normal">
              (Selecione um nível para explorar suas aulas e atividades associadas)
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card: Todos os Níveis */}
          <button
            type="button"
            onClick={() => setSelectedTrackId('all')}
            className={`p-5 rounded-2xl cursor-pointer transition-all border text-left flex flex-col justify-between ${
              selectedTrackId === 'all'
                ? 'bg-[#6C0F37] text-white border-[#57102E] shadow-md'
                : 'bg-white text-[#2B2426] border-[#E6E1D8] hover:border-[#6C0F37]/30'
            }`}
          >
            <div>
              <span className="text-lg block mb-1">📚</span>
              <h3 className={`text-base font-bold transition-colors ${
                selectedTrackId === 'all' ? 'text-white' : 'text-[#6C0F37]'
              }`}>
                Todos os Níveis
              </h3>
            </div>
            <div className={`mt-3 pt-2 border-t ${selectedTrackId === 'all' ? 'border-white/20' : 'border-[#E6E1D8]'}`}>
              <span className={`text-xs ${selectedTrackId === 'all' ? 'text-[#FFFDF7]/80' : 'text-[#6F6865]'}`}>
                {trackStats.totalCount} atividades totais
              </span>
            </div>
          </button>

          {/* Cards dos Níveis (Tracks) */}
          {tracks.map((trk) => {
            const isSelected = selectedTrackId === trk.id;
            const stats = trackStats.tracks[trk.id] || { activityCount: 0, lessonCount: 0 };

            return (
              <button
                key={trk.id}
                type="button"
                onClick={() => setSelectedTrackId(trk.id)}
                className={`p-5 rounded-2xl cursor-pointer transition-all border text-left flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#6C0F37] text-white border-[#57102E] shadow-md'
                    : 'bg-white text-[#2B2426] border-[#E6E1D8] hover:border-[#6C0F37]/30'
                }`}
              >
                <div>
                  <span className="text-lg block mb-1">🎓</span>
                  <h3 className={`text-base font-bold transition-colors line-clamp-1 ${
                    isSelected ? 'text-white' : 'text-[#6C0F37]'
                  }`}>
                    {trk.title}
                  </h3>
                  <span className={`text-xs block mt-0.5 ${
                    isSelected ? 'text-[#FFFDF7]/80' : 'text-[#6F6865]'
                  }`}>
                    {stats.lessonCount} {stats.lessonCount === 1 ? 'aula' : 'aulas'}
                  </span>
                </div>
                <div className={`mt-3 pt-2 border-t ${isSelected ? 'border-white/20' : 'border-[#E6E1D8]'}`}>
                  <span className={`text-xs ${isSelected ? 'text-[#FFFDF7]/80' : 'text-[#6F6865]'}`}>
                    {stats.activityCount} atividades totais
                  </span>
                </div>
              </button>
            );
          })}

          {/* Card: Atividades Gerais (Sem nível fixo) */}
          <button
            type="button"
            onClick={() => setSelectedTrackId('general')}
            className={`p-5 rounded-2xl cursor-pointer transition-all border text-left flex flex-col justify-between ${
              selectedTrackId === 'general'
                ? 'bg-[#6C0F37] text-white border-[#57102E] shadow-md'
                : 'bg-white text-[#2B2426] border-[#E6E1D8] hover:border-[#6C0F37]/30'
            }`}
          >
            <div>
              <span className="text-lg block mb-1">🌐</span>
              <h3 className={`text-base font-bold transition-colors ${
                selectedTrackId === 'general' ? 'text-white' : 'text-[#6C0F37]'
              }`}>
                Atividades Gerais
              </h3>
              <span className={`text-xs block mt-0.5 ${
                selectedTrackId === 'general' ? 'text-[#FFFDF7]/80' : 'text-[#6F6865]'
              }`}>
                Banco livre
              </span>
            </div>
            <div className={`mt-3 pt-2 border-t ${selectedTrackId === 'general' ? 'border-white/20' : 'border-[#E6E1D8]'}`}>
              <span className={`text-xs ${selectedTrackId === 'general' ? 'text-[#FFFDF7]/80' : 'text-[#6F6865]'}`}>
                {trackStats.generalCount} atividades totais
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ÁREA DE EXIBIÇÃO: ORGANIZADA POR AULAS DO NÍVEL SELECIONADO OU GRADE COMPLETA */}
      {groupedByLesson ? (
        <div className="space-y-8">
          {/* Aulas do Nível Selecionado */}
          {groupedByLesson.lessonsWithActs.map(({ lesson, activities: lessonActs }) => (
            <div
              key={lesson.id}
              className="space-y-3 bg-[#FAF8F5]/60 border border-[#E6E1D8] rounded-2xl p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6E1D8] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 bg-[#6C0F37] text-white rounded-lg text-xs font-bold shrink-0">
                    Aula
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#2B2426]">{lesson.title}</h3>
                    {lesson.moduleTitle && (
                      <p className="text-[11px] text-[#6F6865]">{lesson.moduleTitle}</p>
                    )}
                  </div>
                </div>

                <span className="text-xs font-semibold text-[#6C0F37] bg-white border border-[#E6E1D8] px-2.5 py-1 rounded-lg">
                  {lessonActs.length} {lessonActs.length === 1 ? 'atividade' : 'atividades'}
                </span>
              </div>

              {lessonActs.length === 0 ? (
                <p className="text-xs text-[#6F6865] italic py-2">
                  Nenhuma atividade vinculada a esta aula ainda.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {lessonActs.map(renderActivityCard)}
                </div>
              )}
            </div>
          ))}

          {/* Atividades Gerais deste Nível */}
          {groupedByLesson.unassignedActivities.length > 0 && (
            <div className="space-y-3 bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl p-5">
              <h3 className="text-sm font-bold text-[#6C0F37] uppercase tracking-wider">
                Outras Atividades deste Nível ({groupedByLesson.unassignedActivities.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedByLesson.unassignedActivities.map(renderActivityCard)}
              </div>
            </div>
          )}
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-12 text-center shadow-[0_2px_8px_rgba(44,30,34,0.06)]">
          <div className="w-12 h-12 rounded-full bg-[#F7F4ED] text-[#6C0F37] flex items-center justify-center mx-auto mb-3 text-xl font-bold">
            💡
          </div>
          <h3 className="text-base font-bold text-[#2B2426]">Nenhuma atividade encontrada</h3>
          <p className="text-xs text-[#6F6865] mt-1 max-w-sm mx-auto mb-5">
            {search || categoryFilter || correctionFilter !== 'all'
              ? 'Nenhuma atividade corresponde aos filtros selecionados. Tente ajustar os termos de busca.'
              : 'Seu Banco de Atividades está pronto. Clique abaixo para cadastrar seu primeiro modelo reutilizável.'}
          </p>
          <CreateActivityModal
            tracks={tracks}
            triggerText="+ Nova atividade"
            organizationId={organizationId}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredActivities.map(renderActivityCard)}
        </div>
      )}

      {/* REQUISITO 1: Construtor Completo Aberto em Modo de Edição */}
      {editingActivity && (
        <CreateActivityModal
          tracks={tracks}
          initialData={editingActivity}
          isOpen={Boolean(editingActivity)}
          onClose={() => setEditingActivity(null)}
          organizationId={organizationId}
        />
      )}

      {/* REQUISITO 3: Modal de Atribuição em Lote */}
      {isBulkAssignOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !bulkAssignLoading) setIsBulkAssignOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#6C0F37]">Atribuir em Lote</h3>
                <p className="text-xs text-[#6F6865]">
                  Atribuir <strong>{selectedIds.length}</strong> atividades selecionadas para um aluno individual ou turma inteira.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkAssignOpen(false)}
                className="text-[#6F6865] hover:text-[#2B2426] p-1 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Lista das atividades selecionadas */}
            <div className="max-h-36 overflow-y-auto p-3 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-1.5 text-xs">
              <span className="font-bold text-[#2B2426] block mb-1">
                Atividades que serão atribuídas:
              </span>
              {initialActivities
                .filter((a) => selectedIds.includes(a.id))
                .map((a) => (
                  <div key={a.id} className="flex items-center gap-1.5 text-[#6C0F37] font-medium">
                    <span>✓</span>
                    <span className="truncate">{a.title}</span>
                  </div>
                ))}
            </div>

            <form onSubmit={handleBulkAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Destino da Atribuição
                </label>
                <select
                  name="target_type"
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426]"
                >
                  <option value="student">Aluno Individual</option>
                  <option value="class">Turma Completa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Selecione o Aluno ou Turma
                </label>
                <select
                  name="target_id"
                  required
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426]"
                >
                  <optgroup label="Alunos">
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Turmas">
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsBulkAssignOpen(false)}
                  disabled={bulkAssignLoading}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={bulkAssignLoading}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {bulkAssignLoading ? 'Atribuindo...' : `Atribuir ${selectedIds.length} Atividades`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Pré-visualização da Atividade */}
      {previewActivity && (
        <ActivityPreviewModal
          isOpen={true}
          onClose={() => setPreviewActivity(null)}
          title={previewActivity.title}
          category={previewActivity.metadata?.category || 'Exercício e prática'}
          targetSkills={previewActivity.metadata?.target_skills || []}
          instructions={previewActivity.content_markdown || ''}
          blocks={
            previewActivity.metadata?.blocks ||
            previewActivity.metadata?.items ||
            []
          }
          correctionType={
            previewActivity.metadata?.no_correction_needed ||
            previewActivity.metadata?.external_correction
              ? 'external'
              : previewActivity.metadata?.correction_type || 'manual'
          }
        />
      )}
    </div>
  );
}
