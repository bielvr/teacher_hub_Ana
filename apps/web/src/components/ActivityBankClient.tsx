'use client';

import { useState, useMemo } from 'react';
import { CreateActivityModal } from './CreateActivityModal';
import { ActivityCardMenu } from './ActivityCardMenu';
import { ActivityPreviewModal } from './activities/ActivityPreviewModal';

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
  const [trackFilter, setTrackFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [correctionFilter, setCorrectionFilter] = useState('all');
  const [previewActivity, setPreviewActivity] = useState<ActivityItem | null>(null);

  // Filtra as atividades na memória em tempo real
  const filteredActivities = useMemo(() => {
    return initialActivities.filter((act) => {
      // 1. Busca por nome
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = act.title.toLowerCase().includes(query);
        const matchesDesc = (act.content_markdown || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // 2. Filtro por nível/track
      if (trackFilter) {
        const actTrackId = act.lessons?.modules?.tracks?.id;
        if (actTrackId !== trackFilter) return false;
      }

      // 3. Filtro por categoria / objetivo
      if (categoryFilter) {
        const cat = act.metadata?.category || act.type;
        if (cat !== categoryFilter) return false;
      }

      // 4. Filtro por formato de correção
      if (correctionFilter !== 'all') {
        const corrType = act.metadata?.correction_type || 'manual';
        if (corrType !== correctionFilter) return false;
      }

      return true;
    });
  }, [initialActivities, search, trackFilter, categoryFilter, correctionFilter]);

  // Lista única de categorias para o filtro
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    initialActivities.forEach((a) => {
      if (a.metadata?.category) set.add(a.metadata.category);
      else set.add(a.type);
    });
    return Array.from(set);
  }, [initialActivities]);

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Busca + Botão Nova Atividade */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl p-4 sm:p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#6F6865]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

        {/* Filtros Suspensos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E6E1D8]">
          {/* Filtro por Nível */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
              Nível Pedagógico
            </label>
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
            >
              <option value="">Todos os Níveis</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

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
              <option value="manual">Manual (Pela Professora)</option>
              <option value="mixed">Mista</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid de Cards de Atividades Reutilizáveis */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-12 text-center shadow-[0_2px_8px_rgba(44,30,34,0.06)]">
          <div className="w-12 h-12 rounded-full bg-[#F7F4ED] text-[#6C0F37] flex items-center justify-center mx-auto mb-3 text-xl font-bold">
            💡
          </div>
          <h3 className="text-base font-bold text-[#2B2426]">
            Nenhuma atividade encontrada
          </h3>
          <p className="text-xs text-[#6F6865] mt-1 max-w-sm mx-auto mb-5">
            {search || trackFilter || categoryFilter || correctionFilter !== 'all'
              ? 'Nenhuma atividade corresponde aos filtros selecionados. Tente ajustar os termos de busca.'
              : 'Seu Banco de Atividades está pronto. Clique abaixo para cadastrar seu primeiro modelo reutilizável.'}
          </p>
          <CreateActivityModal tracks={tracks} triggerText="+ Nova atividade" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredActivities.map((act) => {
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
            const autoCount =
              meta.auto_count ?? Math.max(0, itemsCount - manualCount);

            const correctionType = meta.correction_type || (itemsCount > 0 && manualCount === 0 ? 'auto' : 'manual');
            const targetSkills: string[] = meta.target_skills || [];

            // Vínculo curricular
            const trackName = act.lessons?.modules?.tracks?.title;
            const moduleName = act.lessons?.modules?.title;
            const lessonName = act.lessons?.title;
            const curricularPath = trackName
              ? `${trackName} • ${moduleName || ''} • ${lessonName || ''}`
              : lessonName
              ? `Aula: ${lessonName}`
              : 'Atividade Geral';

            return (
              <div
                key={act.id}
                className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] hover:border-[#6C0F37]/50 hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Topo do Card: Categoria, Correção e Menu de Ações */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Badge de Objetivo Geral */}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#F7F4ED] px-2 py-0.5 rounded border border-[#E6E1D8]">
                          {meta.category || act.type}
                        </span>

                        {/* Badge de Status de Correção */}
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

                      <p className="text-[11px] text-[#6F6865] font-medium truncate pt-0.5" title={curricularPath}>
                        {curricularPath}
                      </p>
                    </div>

                    <ActivityCardMenu
                      activity={act}
                      students={students}
                      classes={classes}
                    />
                  </div>

                  {/* Título da Atividade */}
                  <h3 className="text-base font-bold text-[#2B2426] line-clamp-2 leading-snug">
                    {act.title}
                  </h3>

                  {act.content_markdown && (
                    <p className="text-xs text-[#6F6865] line-clamp-2 leading-relaxed">
                      {act.content_markdown.replace(/<!--page-break-->/g, ' ')}
                    </p>
                  )}
                </div>

                {/* Rodapé do Card com Resumo de Blocos e Botão Visualizar */}
                <div className="pt-3 border-t border-[#E6E1D8] flex flex-col gap-2 text-xs">
                  <div className="text-[#6F6865] text-[11px] leading-tight">
                    <span className="font-semibold text-[#2B2426]">
                      {itemsCount} {itemsCount === 1 ? 'questão' : 'questões'}
                    </span>{' '}
                    {itemsCount > 0 && (
                      <span>
                        ({autoCount} {autoCount === 1 ? 'automática' : 'automáticas'}, {manualCount} {manualCount === 1 ? 'manual' : 'manuais'})
                      </span>
                    )}{' '}
                    • <span>{resourcesCount} {resourcesCount === 1 ? 'mídia de apoio' : 'mídias de apoio'}</span>
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
          })}
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
          correctionType={previewActivity.metadata?.correction_type || 'manual'}
        />
      )}
    </div>
  );
}
