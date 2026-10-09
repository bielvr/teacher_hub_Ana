'use client';

import { useState } from 'react';
import { createTrackAction } from '../actions/tracks';

export function CreateTrackModal({ organizationId }: { organizationId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition shadow-xs"
      >
        + Nova Trilha
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xl w-full max-w-sm relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600 text-sm font-bold"
            >
              ✕
            </button>

            <h4 className="text-base font-bold text-zinc-900 mb-3">Criar Nova Trilha</h4>

            <form
              action={async (formData) => {
                await createTrackAction(formData);
                setIsOpen(false);
              }}
              className="space-y-3"
            >
              <input type="hidden" name="organization_id" value={organizationId} />

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">
                  Título da Trilha
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Ex: Minha Jornada - Beginner"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">
                  Descrição (Opcional)
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Resumo pedagógico..."
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition"
                >
                  Salvar Trilha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}