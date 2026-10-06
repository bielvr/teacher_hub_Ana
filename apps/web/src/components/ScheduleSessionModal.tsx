'use client';

import { useState } from 'react';
import { scheduleSessionAction } from '../actions/calendar';

interface ClassOption {
  id: string;
  name: string;
}

export function ScheduleSessionModal({
  orgId,
  classes,
}: {
  orgId: string;
  classes: ClassOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await scheduleSessionAction(formData);
      setIsOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao agendar aula');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors shadow-sm"
      >
        + Agendar Aula
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-zinc-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-zinc-900">Agendar Aula ao Vivo</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="organization_id" value={orgId} />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">
                  Turma
                </label>
                <select
                  name="class_id"
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                >
                  <option value="">Selecione a turma...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">
                  Título da Aula
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Ex: Conversation Practice - Unit 3"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">
                    Data
                  </label>
                  <input
                    name="scheduled_date"
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">
                    Horário
                  </label>
                  <input
                    name="scheduled_time"
                    type="time"
                    required
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">
                    Duração (min)
                  </label>
                  <input
                    name="duration_minutes"
                    type="number"
                    defaultValue={60}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">
                    Link Meet/Zoom
                  </label>
                  <input
                    name="meet_url"
                    type="url"
                    placeholder="https://meet.google.com/..."
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {loading ? 'Salvando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}