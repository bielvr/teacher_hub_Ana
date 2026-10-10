'use client';

import { useState, useEffect } from 'react';

export interface DashboardPreferences {
  // Preferências do Professor
  teacherSummary: boolean;
  teacherUpcomingLessons: boolean;
  teacherPendingItems: boolean;
  teacherCalendarMini: boolean;
  teacherNotifications: boolean;
  // Preferências do Aluno
  studentNextLive: boolean;
  studentClasses: boolean;
  studentActivities: boolean;
  // Layout Geral
  calendarSize: 'compact' | 'expanded'; // 'compact' = 1/3, 'expanded' = 2/3
}

export const defaultPreferences: DashboardPreferences = {
  teacherSummary: true,
  teacherUpcomingLessons: true,
  teacherPendingItems: true,
  teacherCalendarMini: true,
  teacherNotifications: true,
  studentNextLive: true,
  studentClasses: true,
  studentActivities: true,
  calendarSize: 'compact',
};

const STORAGE_KEY = 'fikra_dashboard_layout';

export function getStoredPreferences(): DashboardPreferences {
  if (typeof window === 'undefined') return defaultPreferences;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreferences;
    return { ...defaultPreferences, ...JSON.parse(raw) };
  } catch {
    return defaultPreferences;
  }
}

export function saveStoredPreferences(prefs: DashboardPreferences) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new Event('fikra_dashboard_prefs_changed'));
  } catch (err) {
    console.error('Erro ao salvar preferências:', err);
  }
}

export function useDashboardPreferences() {
  const [prefs, setPrefs] = useState<DashboardPreferences>(defaultPreferences);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPrefs(getStoredPreferences());
    setMounted(true);

    const handleUpdate = () => {
      setPrefs(getStoredPreferences());
    };

    window.addEventListener('fikra_dashboard_prefs_changed', handleUpdate);
    return () => window.removeEventListener('fikra_dashboard_prefs_changed', handleUpdate);
  }, []);

  return { prefs, mounted };
}

interface DashboardCustomizerProps {
  role: 'teacher' | 'student';
}

export function DashboardCustomizer({ role }: DashboardCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPrefs, setCurrentPrefs] = useState<DashboardPreferences>(defaultPreferences);

  useEffect(() => {
    setCurrentPrefs(getStoredPreferences());
  }, [isOpen]);

  const toggle = (key: keyof DashboardPreferences) => {
    const updated = {
      ...currentPrefs,
      [key]: !currentPrefs[key],
    };
    setCurrentPrefs(updated);
    saveStoredPreferences(updated);
  };

  const setCalendarSize = (size: 'compact' | 'expanded') => {
    const updated = {
      ...currentPrefs,
      calendarSize: size,
    };
    setCurrentPrefs(updated);
    saveStoredPreferences(updated);
  };

  const handleReset = () => {
    setCurrentPrefs(defaultPreferences);
    saveStoredPreferences(defaultPreferences);
  };

  return (
    <>
      {/* Botão Discreto no Canto Superior Direito */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6F6865] hover:text-[#2B2426] bg-white border border-[#E6E1D8] hover:border-[#6C0F37]/30 rounded-xl transition shadow-2xs hover:bg-[#F7F4ED] cursor-pointer"
        title="Personalizar blocos visíveis do painel"
      >
        <span>⚙️</span>
        <span>Personalizar painel</span>
      </button>

      {/* Modal de Personalização */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white border border-[#E6E1D8] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleIn">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37]">
                  Configuração de Visualização
                </span>
                <h3 className="text-lg font-bold text-[#2B2426] mt-0.5">
                  Personalizar Painel
                </h3>
                <p className="text-xs text-[#6F6865] mt-1">
                  Ative ou oculte os blocos da tela inicial conforme seu fluxo diário.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#6F6865] hover:text-[#2B2426] p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Lista de Toggles por Role */}
            <div className="space-y-3 pt-2 border-t border-[#E6E1D8]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#2B2426]">
                Blocos Visíveis:
              </p>

              {role === 'teacher' ? (
                <>
                  <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F7F4ED] transition cursor-pointer">
                    <span className="text-xs text-[#2B2426] font-medium">Resumo do dia / Métricas</span>
                    <input
                      type="checkbox"
                      checked={currentPrefs.teacherSummary}
                      onChange={() => toggle('teacherSummary')}
                      className="accent-[#6C0F37] w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F7F4ED] transition cursor-pointer">
                    <span className="text-xs text-[#2B2426] font-medium">Aulas agendadas hoje</span>
                    <input
                      type="checkbox"
                      checked={currentPrefs.teacherUpcomingLessons}
                      onChange={() => toggle('teacherUpcomingLessons')}
                      className="accent-[#6C0F37] w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F7F4ED] transition cursor-pointer">
                    <span className="text-xs text-[#2B2426] font-medium">Turmas recentes / Pendências</span>
                    <input
                      type="checkbox"
                      checked={currentPrefs.teacherPendingItems}
                      onChange={() => toggle('teacherPendingItems')}
                      className="accent-[#6C0F37] w-4 h-4 cursor-pointer"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F7F4ED] transition cursor-pointer">
                    <span className="text-xs text-[#2B2426] font-medium">Próximo encontro / Aula ao vivo</span>
                    <input
                      type="checkbox"
                      checked={currentPrefs.studentNextLive}
                      onChange={() => toggle('studentNextLive')}
                      className="accent-[#6C0F37] w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F7F4ED] transition cursor-pointer">
                    <span className="text-xs text-[#2B2426] font-medium">Minhas turmas vinculadas</span>
                    <input
                      type="checkbox"
                      checked={currentPrefs.studentClasses}
                      onChange={() => toggle('studentClasses')}
                      className="accent-[#6C0F37] w-4 h-4 cursor-pointer"
                    />
                  </label>
                </>
              )}
            </div>

            {/* Alternador do Tamanho do Bloco Principal */}
            <div className="pt-3 border-t border-[#E6E1D8] space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#2B2426]">
                Largura da Grade de Aulas:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCalendarSize('compact')}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border transition ${
                    currentPrefs.calendarSize === 'compact'
                      ? 'bg-[#6C0F37] text-white border-[#6C0F37] font-semibold'
                      : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:bg-[#F7F4ED]'
                  }`}
                >
                  Compacto (50%)
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarSize('expanded')}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border transition ${
                    currentPrefs.calendarSize === 'expanded'
                      ? 'bg-[#6C0F37] text-white border-[#6C0F37] font-semibold'
                      : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:bg-[#F7F4ED]'
                  }`}
                >
                  Expandido (66%)
                </button>
              </div>
            </div>

            {/* Ações do Rodapé */}
            <div className="pt-4 border-t border-[#E6E1D8] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-[#6F6865] hover:text-[#6C0F37] hover:underline transition"
              >
                Restaurar layout padrão Fikra
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="py-2 px-4 bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold rounded-xl transition shadow-xs"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
