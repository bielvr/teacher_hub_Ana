import Link from "next/link";
import { colors } from "../src/theme/colors";

export default function Home() {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: colors.background }}
    >
      <main 
        className="w-full max-w-md rounded-2xl p-8 shadow-xl text-center space-y-6"
        style={{ backgroundColor: colors.surface }}
      >
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Teste de Paleta: Hub
          </h1>
          <p className="text-sm text-zinc-300">
            Fundo em <code className="font-mono">{colors.background}</code> e card em <code className="font-mono">{colors.surface}</code>
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/professor"
            className="w-full py-3 px-4 rounded-xl font-medium text-sm transition-opacity hover:opacity-90 shadow-sm"
            style={{ 
              backgroundColor: colors.click, 
              color: colors.border 
            }}
          >
            Acessar Área do Professor →
          </Link>
          
          <Link
            href="/professor/tracks"
            className="w-full py-3 px-4 rounded-xl font-medium text-sm border border-white/20 text-white hover:bg-white/10 transition-colors"
          >
            Ver Trilhas (Professor)
          </Link>

          <Link
            href="/professor/classes"
            className="w-full py-3 px-4 rounded-xl font-medium text-sm border border-white/20 text-white hover:bg-white/10 transition-colors"
          >
            Ver Turmas (Professor)
          </Link>
        </div>
      </main>
    </div>
  );
}