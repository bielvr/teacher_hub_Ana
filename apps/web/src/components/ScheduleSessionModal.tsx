'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await scheduleSessionAction(formData);
      setIsOpen(false);
      router.refresh();
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
        className="px-4 py-2 text-sm font-semibold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs cursor-pointer"
      >
        + Agendar Aula
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#E6E1D8] animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#6C0F37]">Agendar Aula ao Vivo</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#6F6865] hover:text-[#2B2426] text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="organization_id" value={orgId} />

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Turma
                </label>
                <select
                  name="class_id"
                  required
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] focus:border-[#6C0F37] cursor-pointer"
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
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Título da Aula
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Ex: Conversation Practice - Unit 3"
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Data
                  </label>
                  <input
                    name="scheduled_date"
                    type="date"
                    required
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Horário
                  </label>
                  <input
                    name="scheduled_time"
                    type="time"
                    required
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Duração (min)
                  </label>
                  <input
                    name="duration_minutes"
                    type="number"
                    defaultValue={60}
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Link Meet/Zoom
                  </label>
                  <input
                    name="meet_url"
                    type="url"
                    placeholder="https://meet.google.com/..."
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
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