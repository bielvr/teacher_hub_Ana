'use client';

import { useState } from 'react';
import { updateLessonReleaseAction } from '../actions/tracks';

interface LessonItem {
  id: string;
  title: string;
  release_type: 'immediate' | 'scheduled';
  release_date: string | null;
  activities?: { id: string; title: string; type: string }[];
}

interface UnitItem {
  id: string;
  title: string;
  lessons: LessonItem[];
}

interface TrackPlanningItem {
  id: string;
  title: string;
  modules: UnitItem[];
}

interface StudentOption {
  id: string;
  full_name: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface PlanningClientProps {
  tracks: TrackPlanningItem[];
  students: StudentOption[];
  classes: ClassOption[];
}

export function PlanningClient({ tracks, students, classes }: PlanningClientProps) {
  const [targetType, setTargetType] = useState<'class' | 'student'>('class');
  const [selectedTargetId, setSelectedTargetId] = useState(
    classes[0]?.id || students[0]?.id || ''
  );
  const [selectedTrackId, setSelectedTrackId] = useState(tracks[0]?.id || '');
  const [updatingLessonId, setUpdatingLessonId] = useState<string | null>(null);

  const currentTrack = tracks.find((t) => t.id === selectedTrackId) || tracks[0];

  const handleUpdateRelease = async (
    lessonId: string,
    releaseType: 'immediate' | 'scheduled',
    releaseDate: string | null
  ) => {
    setUpdatingLessonId(lessonId);
    try {
      const formData = new FormData();
      formData.append('lesson_id', lessonId);
      formData.append('release_type', releaseType);
      if (releaseDate) formData.append('release_date', releaseDate);
      await updateLessonReleaseAction(formData);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar regra de liberação.');
    } finally {
      setUpdatingLessonId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Seleção: Turma ou Aluna + Nível Pedagógico */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* Alternador de Tipo de Alvo */}
          <div>
            <label className="block text-xs font-semibold text-[#6F6865] mb-1">
              Planejar para:
            </label>
            <div className="flex bg-[#F7F4ED] p-1 rounded-xl border border-[#E6E1D8]">
              <button
                type="button"
                onClick={() => {
                  setTargetType('class');
                  setSelectedTargetId(classes[0]?.id || '');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  targetType === 'class'
                    ? 'bg-[#6C0F37] text-white shadow-xs'
                    : 'text-[#6F6865] hover:text-[#2B2426]'
                }`}
              >
                👥 Turma
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetType('student');
                  setSelectedTargetId(students[0]?.id || '');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  targetType === 'student'
                    ? 'bg-[#6C0F37] text-white shadow-xs'
                    : 'text-[#6F6865] hover:text-[#2B2426]'
                }`}
              >
                👤 Aluna Individual
              </button>
            </div>
          </div>

          {/* Seletor de Turma ou Aluna */}
          <div>
            <label className="block text-xs font-semibold text-[#6F6865] mb-1">
              {targetType === 'class' ? 'Selecione a Turma' : 'Selecione a Aluna'}
            </label>
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
            >
              {targetType === 'class'
                ? classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                : students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
            </select>
          </div>

          {/* Seletor de Nível Pedagógico */}
          <div>
            <label className="block text-xs font-semibold text-[#6F6865] mb-1">
              Nível Pedagógico
            </label>
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grade e Cronograma de Liberação */}
      {!currentTrack || !currentTrack.modules || currentTrack.modules.length === 0 ? (
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-12 text-center shadow-[0_2px_8px_rgba(44,30,34,0.06)]">
          <div className="w-12 h-12 rounded-full bg-[#F7F4ED] text-[#6C0F37] flex items-center justify-center mx-auto mb-3 text-xl font-bold">
            🗓️
          </div>
          <h3 className="text-base font-bold text-[#2B2426]">
            Nenhuma unidade cadastrada neste nível
          </h3>
          <p className="text-xs text-[#6F6865] mt-1">
            Cadastre unidades e aulas em Materiais Didáticos para planejar o cronograma de liberação.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {currentTrack.modules.map((unit, uIdx) => (
            <div
              key={unit.id}
              className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-4"
            >
              {/* Cabeçalho da Unidade */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E6E1D8]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#F7F4ED] px-2 py-0.5 rounded border border-[#E6E1D8]">
                    Unidade {uIdx + 1}
                  </span>
                  <h3 className="text-lg font-bold text-[#6C0F37] mt-1">
                    {unit.title}
                  </h3>
                </div>
                <span className="text-xs text-[#6F6865]">
                  {unit.lessons?.length || 0} aulas no cronograma
                </span>
              </div>

              {/* Lista de Aulas e Regras de Liberação */}
              {(!unit.lessons || unit.lessons.length === 0) ? (
                <p className="text-xs text-[#6F6865] italic py-2">
                  Nenhuma aula nesta unidade.
                </p>
              ) : (
                <div className="space-y-3">
                  {unit.lessons.map((lesson, lIdx) => {
                    const isImmediate = lesson.release_type === 'immediate';
                    const isScheduled = lesson.release_type === 'scheduled';
                    const isUpdating = updatingLessonId === lesson.id;

                    return (
                      <div
                        key={lesson.id}
                        className="p-4 bg-[#FFFDF7] border border-[#E6E1D8] rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-[#6C0F37]/30 transition-colors"
                      >
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-[#6C0F37]">
                            Aula {lIdx + 1}
                          </span>
                          <h4 className="text-sm font-bold text-[#2B2426]">
                            {lesson.title}
                          </h4>
                          {lesson.activities && lesson.activities.length > 0 && (
                            <p className="text-[11px] text-[#6F6865]">
                              📎 {lesson.activities.length} material pedagógico vinculado
                            </p>
                          )}
                        </div>

                        {/* Controles de Liberação */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5 bg-white border border-[#E6E1D8] p-1 rounded-xl">
                            {/* 1. Liberação Imediata */}
                            <button
                              type="button"
                              onClick={() => handleUpdateRelease(lesson.id, 'immediate', null)}
                              disabled={isUpdating}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                isImmediate
                                  ? 'bg-[#6C0F37] text-white shadow-xs'
                                  : 'text-[#6F6865] hover:text-[#2B2426]'
                              }`}
                            >
                              ⚡ Liberação Imediata
                            </button>

                            {/* 2. Semanal (Agendada) */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextWeek = new Date();
                                nextWeek.setDate(nextWeek.getDate() + (lIdx + 1) * 7);
                                handleUpdateRelease(
                                  lesson.id,
                                  'scheduled',
                                  nextWeek.toISOString().split('T')[0]
                                );
                              }}
                              disabled={isUpdating}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                isScheduled && !lesson.release_date
                                  ? 'bg-[#6C0F37] text-white shadow-xs'
                                  : 'text-[#6F6865] hover:text-[#2B2426]'
                              }`}
                            >
                              📅 Semanal
                            </button>
                          </div>

                          {/* 3. Data Específica com Datepicker */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-[#6F6865]">
                              Ou data:
                            </span>
                            <input
                              type="date"
                              defaultValue={lesson.release_date || ''}
                              onChange={(e) =>
                                handleUpdateRelease(lesson.id, 'scheduled', e.target.value)
                              }
                              disabled={isUpdating}
                              className="px-2.5 py-1.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                            />
                          </div>

                          {isUpdating && (
                            <span className="text-[10px] text-[#6C0F37] font-semibold animate-pulse">
                              Salvando...
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
