'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ensureAffiliatePartnerAction,
  updatePartnerPixKeyAction,
} from '../../actions/affiliates';
import type {
  AffiliatePlanCycle,
  Database,
} from '../../types/database';

type PartnerRow = Database['public']['Tables']['affiliate_partners']['Row'];
type PayoutRow = Database['public']['Tables']['affiliate_payouts']['Row'];

export interface AnonymizedReferralItem {
  id: string;
  anonymizedIdentifier: string;
  planSlug: string;
  cycle: AffiliatePlanCycle;
  status: string;
  createdAt: string;
}

interface AffiliatePartnerClientProps {
  orgId: string;
  isOwner: boolean;
  teacherName: string;
  partner: PartnerRow | null;
  metrics: {
    activeReferralsCount: number;
    pendingCommissionsTotal: number;
    availableForPayoutTotal: number;
    totalPaid: number;
  };
  referrals: AnonymizedReferralItem[];
  payouts: PayoutRow[];
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getCurrentQuarterDeadline(): string {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const endMonth = quarter * 3 + 2;
  const lastDay = new Date(now.getFullYear(), endMonth + 1, 0);
  return lastDay.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function AffiliatePartnerClient({
  orgId,
  isOwner,
  teacherName,
  partner: initialPartner,
  metrics,
  referrals,
  payouts,
}: AffiliatePartnerClientProps) {
  const [partner, setPartner] = useState<PartnerRow | null>(initialPartner);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Estado do Modal / Edição de Chave PIX
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixInput, setPixInput] = useState(initialPartner?.pix_key || '');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const referralCode = partner?.referral_code || 'FIKRA-PARCEIRA';
  const referralLink = `fikra.com.br?ref=${referralCode}`;
  const fullReferralUrl = `https://fikra.com.br?ref=${referralCode}`;

  const quarterProgressRaw = partner?.current_quarter_paid_referrals || 0;
  const quarterGoal = 5;
  const quarterCurrentCycle = quarterProgressRaw % quarterGoal === 0 && quarterProgressRaw > 0
    ? quarterGoal
    : quarterProgressRaw % quarterGoal;
  const progressPercentage = Math.min(100, Math.round((quarterCurrentCycle / quarterGoal) * 100));

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      // Fallback silencioso
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullReferralUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Fallback silencioso
    }
  };

  const handleActivatePartner = () => {
    setFeedbackMsg(null);
    startTransition(async () => {
      try {
        const res = await ensureAffiliatePartnerAction(orgId);
        if (res.success && res.data) {
          setPartner(res.data);
          setPixInput(res.data.pix_key || '');
          setFeedbackMsg({
            type: 'success',
            text: 'Seu código exclusivo Conexão Fikra foi ativado com sucesso!',
          });
        } else {
          setFeedbackMsg({
            type: 'error',
            text: res.error || 'Não foi possível ativar o perfil de parceira.',
          });
        }
      } catch (err: any) {
        setFeedbackMsg({
          type: 'error',
          text: err?.message || 'Não foi possível ativar o perfil de parceira.',
        });
      }
    });
  };

  const handleSavePixKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner) return;
    setFeedbackMsg(null);

    startTransition(async () => {
      try {
        const res = await updatePartnerPixKeyAction({
          partnerId: partner.id,
          pixKey: pixInput,
          orgId,
        });
        if (res.success) {
          setPartner({ ...partner, pix_key: res.pixKey || null });
          setIsPixModalOpen(false);
          setFeedbackMsg({
            type: 'success',
            text: 'Chave PIX atualizada com sucesso!',
          });
        } else {
          setFeedbackMsg({
            type: 'error',
            text: res.error || 'Erro ao salvar chave PIX.',
          });
        }
      } catch (err: any) {
        setFeedbackMsg({
          type: 'error',
          text: err?.message || 'Erro ao salvar chave PIX.',
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho Institucional Conexão Fikra */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E6E1D8] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6C0F37]/10 text-[#6C0F37] text-xs font-bold uppercase tracking-wider mb-2">
            <span>✦ Programa Oficial de Parcerias</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2B2426] tracking-tight">
            Conexão Fikra
          </h1>
          <p className="text-sm text-[#6F6865] mt-1 max-w-2xl">
            Indique colegas professoras para a Fikra, receba{' '}
            <strong className="text-[#6C0F37]">20% nos planos mensais</strong> e{' '}
            <strong className="text-[#6C0F37]">25% nos planos anuais</strong>, e conquiste
            trimestres gratuitos na sua assinatura.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isOwner && (
            <Link
              href={`/professor/admin/affiliates?org=${orgId}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2B2426] hover:bg-[#3d3437] text-[#FFFDF7] text-xs font-semibold shadow-xs transition-colors"
            >
              <span>⚙️ Painel de Gestão da Titular</span>
            </Link>
          )}
          {!partner && (
            <button
              type="button"
              onClick={handleActivatePartner}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6C0F37] hover:bg-[#57102E] text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? 'Ativando código...' : '✨ Ativar Meu Código de Parceira'}
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-xs underline ml-4 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 1. CARD DE IDENTIFICAÇÃO DA PARCEIRA */}
      <div className="bg-gradient-to-br from-[#6C0F37] to-[#4E0A27] rounded-2xl p-6 sm:p-8 text-[#FFFDF7] shadow-md relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Coluna Esquerda: Saudação + Código e Link */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#D7CE36] text-[#6C0F37] text-[11px] font-bold uppercase tracking-wider">
                {partner?.status === 'active'
                  ? 'Parceira Ativa'
                  : partner
                  ? 'Cadastro Registrado'
                  : 'Pronta para Ativar'}
              </span>
              <span className="text-xs text-[#FFFDF7]/80">
                Titular da conta: <strong className="text-white">{teacherName}</strong>
              </span>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-[#FFFDF7]/75 font-semibold">
                Seu código exclusivo & link parametrizado
              </p>
              <div className="mt-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Badge do código */}
                <div className="flex items-center justify-between gap-3 bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl px-4 py-2.5">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#D7CE36]">
                      Código de Indicação
                    </span>
                    <span className="font-mono text-lg font-bold tracking-wider text-white">
                      {referralCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 rounded-lg bg-[#D7CE36] hover:bg-[#e3da42] text-[#6C0F37] text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    {copiedCode ? '✓ Copiado!' : 'Copiar código'}
                  </button>
                </div>

                {/* Badge do link parametrizado */}
                <div className="flex-1 flex items-center justify-between gap-3 bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl px-4 py-2.5">
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider text-[#FFFDF7]/70">
                      Link de Convite Direto
                    </span>
                    <span className="font-mono text-xs sm:text-sm text-[#FFFDF7] truncate block">
                      {referralLink}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    {copiedLink ? '✓ Link copiado' : 'Copiar link'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Chave PIX Cadastrada */}
          <div className="lg:col-span-4 bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D7CE36]">
                  Dados para Repasse (PIX)
                </span>
                {partner && (
                  <button
                    type="button"
                    onClick={() => {
                      setPixInput(partner.pix_key || '');
                      setIsPixModalOpen(true);
                    }}
                    className="text-xs font-semibold text-[#FFFDF7] underline hover:text-[#D7CE36] transition-colors cursor-pointer"
                  >
                    {partner.pix_key ? 'Editar chave' : 'Cadastrar chave'}
                  </button>
                )}
              </div>
              <p className="mt-2 font-mono text-sm font-semibold text-white break-all">
                {partner?.pix_key || 'Nenhuma chave PIX informada'}
              </p>
              <p className="text-[11px] text-[#FFFDF7]/75 mt-1">
                Os repasses disponíveis são transferidos diretamente para esta chave PIX.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#FFFDF7]/85">
              <span>Comissão Mensal: <strong>20%</strong></span>
              <span>•</span>
              <span>Comissão Anual: <strong>25%</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. QUATRO CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Indicações ativas */}
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6F6865]">
              Indicações ativas
            </span>
            <span className="w-8 h-8 rounded-xl bg-[#F7F4ED] text-[#6C0F37] flex items-center justify-center font-bold text-sm">
              👥
            </span>
          </div>
          <p className="text-2xl font-bold text-[#2B2426] mt-3">
            {metrics.activeReferralsCount}
          </p>
          <p className="text-xs text-[#6F6865] mt-1">
            Assinaturas ativas atribuídas ao seu código
          </p>
        </div>

        {/* Card 2: Comissões a receber / pendentes */}
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Comissões pendentes
            </span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
              ⏳
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-3">
            {formatBRL(metrics.pendingCommissionsTotal)}
          </p>
          <p className="text-xs text-[#6F6865] mt-1">
            Aguardando confirmação/liquidação no Asaas
          </p>
        </div>

        {/* Card 3: Disponível para repasse */}
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Disponível para repasse
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
              💸
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-3">
            {formatBRL(metrics.availableForPayoutTotal)}
          </p>
          <p className="text-xs text-[#6F6865] mt-1">
            Saldo liberado pronto para transferência PIX
          </p>
        </div>

        {/* Card 4: Total já pago */}
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6C0F37]">
              Total já pago
            </span>
            <span className="w-8 h-8 rounded-xl bg-[#6C0F37]/10 text-[#6C0F37] flex items-center justify-center font-bold text-sm">
              ✓
            </span>
          </div>
          <p className="text-2xl font-bold text-[#6C0F37] mt-3">
            {formatBRL(metrics.totalPaid)}
          </p>
          <p className="text-xs text-[#6F6865] mt-1">
            Histórico consolidado de comissões recebidas
          </p>
        </div>
      </div>

      {/* 3. CARD DE PROGRESSO DA META TRIMESTRAL */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
              <span>🏆 Meta Trimestral de Gratuidade</span>
            </div>
            <h2 className="text-lg font-bold text-[#2B2426]">
              5 novas indicações pagantes no trimestre para renovar 3 meses grátis
            </h2>
            <p className="text-xs text-[#6F6865]">
              Período trimestral vigente até{' '}
              <strong className="text-[#2B2426]">{getCurrentQuarterDeadline()}</strong>.
              {partner?.free_months_end_date && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold">
                  Gratuidade ativa até {formatDateBR(partner.free_months_end_date)}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-2xl font-extrabold text-[#6C0F37]">
                {quarterCurrentCycle}/{quarterGoal}
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#6F6865]">
                contratados no ciclo
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="mt-5">
          <div className="w-full h-3.5 bg-[#F7F4ED] border border-[#E6E1D8] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6C0F37] to-[#D7CE36] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#6F6865]">
            <span>0 indicações</span>
            <span className="font-medium text-[#2B2426]">
              {quarterCurrentCycle >= quarterGoal
                ? '🎉 Meta atingida! +3 meses grátis garantidos!'
                : `Faltam ${quarterGoal - quarterCurrentCycle} indicação(ões) pagante(s) para liberar +3 meses grátis`}
            </span>
            <span>Meta: 5 contratados</span>
          </div>
        </div>
      </div>

      {/* 4. TABELA DE INDICAÇÕES ATRIBUÍDAS (PRIVACIDADE BLINDADA) & 5. HISTÓRICO DE REPASSES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tabela de Indicações Atribuídas (7 colunas) */}
        <div className="lg:col-span-7 bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#2B2426]">
                Indicações Atribuídas
              </h3>
              <p className="text-xs text-[#6F6865]">
                Identificação anonimizada para proteção de dados (LGPD).
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#F7F4ED] text-[#6C0F37] text-xs font-semibold">
              {referrals.length} registro(s)
            </span>
          </div>

          {referrals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4 bg-[#FAF8F5] rounded-xl border border-dashed border-[#E6E1D8]">
              <p className="text-sm font-semibold text-[#2B2426]">
                Nenhuma indicação atribuída ainda
              </p>
              <p className="text-xs text-[#6F6865] mt-1 max-w-md">
                Compartilhe seu link <span className="font-mono text-[#6C0F37]">{referralLink}</span>{' '}
                com outras professoras. Assim que assinarem um plano, aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E6E1D8] text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                    <th className="py-3 pr-3">Indicada (Anonimizada)</th>
                    <th className="py-3 px-3">Plano / Ciclo</th>
                    <th className="py-3 px-3">Data da Adesão</th>
                    <th className="py-3 pl-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1D8]/70 text-sm">
                  {referrals.map((ref) => {
                    const isYearly = ref.cycle === 'yearly';
                    const isActive = ref.status === 'active' || ref.status === 'paid';
                    return (
                      <tr key={ref.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 pr-3 font-semibold text-[#2B2426]">
                          {ref.anonymizedIdentifier}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isYearly
                                ? 'bg-[#6C0F37]/10 text-[#6C0F37]'
                                : 'bg-[#F7F4ED] text-[#2B2426]'
                            }`}
                          >
                            {isYearly ? 'Anual (25%)' : 'Mensal (20%)'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-[#6F6865]">
                          {formatDateBR(ref.createdAt)}
                        </td>
                        <td className="py-3.5 pl-3 text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {isActive ? 'Ativa' : 'Em processamento'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Histórico de Repasses (5 colunas) */}
        <div className="lg:col-span-5 bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#2B2426]">
                Histórico de Repasses
              </h3>
              <p className="text-xs text-[#6F6865]">
                Transferências realizadas e comprovantes anexados.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#F7F4ED] text-[#6C0F37] text-xs font-semibold">
              {payouts.length} repasse(s)
            </span>
          </div>

          {payouts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4 bg-[#FAF8F5] rounded-xl border border-dashed border-[#E6E1D8]">
              <p className="text-sm font-semibold text-[#2B2426]">
                Nenhum repasse realizado até o momento
              </p>
              <p className="text-xs text-[#6F6865] mt-1">
                Quando suas comissões disponíveis forem transferidas via PIX, os comprovantes ficarão disponíveis aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E6E1D8] text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                    <th className="py-3 pr-2">Data</th>
                    <th className="py-3 px-2">Valor</th>
                    <th className="py-3 pl-2 text-right">Comprovante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1D8]/70 text-sm">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3.5 pr-2 text-xs text-[#2B2426]">
                        <span className="font-medium block">{formatDateBR(payout.paid_at)}</span>
                        {payout.notes && (
                          <span className="text-[11px] text-[#6F6865] block truncate max-w-[140px]">
                            {payout.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-2 font-bold text-emerald-700">
                        {formatBRL(Number(payout.amount))}
                      </td>
                      <td className="py-3.5 pl-2 text-right">
                        {payout.receipt_url ? (
                          <a
                            href={payout.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F7F4ED] hover:bg-[#6C0F37] text-[#6C0F37] hover:text-white text-xs font-semibold transition-colors"
                          >
                            <span>📄 Ver recibo</span>
                          </a>
                        ) : (
                          <span className="text-xs text-[#6F6865]">Registrado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CENTRALIZADO DE EDIÇÃO DE CHAVE PIX */}
      {isPixModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setIsPixModalOpen(false)}
        >
          <div
            className="bg-white border border-[#E6E1D8] rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-3">
              <h3 className="text-lg font-bold text-[#2B2426]">
                Configurar Chave PIX para Repasses
              </h3>
              <button
                type="button"
                onClick={() => setIsPixModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F7F4ED] text-[#6F6865] flex items-center justify-center cursor-pointer"
                aria-label="Fechar modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePixKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6865] mb-1.5">
                  Chave PIX (CPF, CNPJ, E-mail, Celular ou Aleatória)
                </label>
                <input
                  type="text"
                  value={pixInput}
                  onChange={(e) => setPixInput(e.target.value)}
                  placeholder="Ex: professora@email.com ou 000.000.000-00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-sm text-[#2B2426] focus:outline-none focus:border-[#6C0F37]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPixModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E6E1D8] text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Salvando...' : 'Salvar Chave PIX'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
