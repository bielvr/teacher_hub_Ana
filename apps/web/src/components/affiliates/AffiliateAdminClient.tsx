'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  registerAffiliatePayoutAction,
  registerReferralAndCommissionAction,
  updateCommissionStatusAction,
  updatePartnerAdminSettingsAction,
} from '../../actions/affiliates';
import type {
  AffiliateCommissionStatus,
  AffiliatePartnerStatus,
  AffiliatePlanCycle,
} from '../../types/database';

export interface AdminPartnerSummary {
  id: string;
  profileId: string;
  partnerName: string;
  partnerEmail: string;
  referralCode: string;
  status: AffiliatePartnerStatus;
  pixKey: string | null;
  currentQuarterPaidReferrals: number;
  freeMonthsEndDate: string | null;
  activeReferralsCount: number;
  pendingBalance: number;
  availableBalance: number;
  paidBalance: number;
  availableCommissionIds: string[];
}

export interface AdminCommissionRecord {
  id: string;
  partnerId: string;
  partnerName: string;
  referralCode: string;
  grossAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  status: AffiliateCommissionStatus;
  paidAt: string | null;
  transferReceiptUrl: string | null;
  createdAt: string;
}

export interface AdminPayoutRecord {
  id: string;
  partnerId: string;
  partnerName: string;
  referralCode: string;
  amount: number;
  receiptUrl: string | null;
  notes: string | null;
  paidAt: string;
}

interface AffiliateAdminClientProps {
  orgId: string;
  partners: AdminPartnerSummary[];
  commissions: AdminCommissionRecord[];
  payouts: AdminPayoutRecord[];
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

export function AffiliateAdminClient({
  orgId,
  partners,
  commissions,
  payouts,
}: AffiliateAdminClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'goals'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  // Estado do Modal "Registrar Repasse"
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(partners[0]?.id || '');
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [payoutNotes, setPayoutNotes] = useState<string>('');

  // Estado do Modal "Lançar Indicação / Comissão"
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [commPartnerId, setCommPartnerId] = useState<string>(partners[0]?.id || '');
  const [commPlanSlug, setCommPlanSlug] = useState<string>('pro');
  const [commCycle, setCommCycle] = useState<AffiliatePlanCycle>('monthly');
  const [commNetAmount, setCommNetAmount] = useState<string>('197.00');
  const [commStatus, setCommStatus] = useState<AffiliateCommissionStatus>('available');

  // Estado do Modal "Ajustar Meta & Gratuidade"
  const [editingPartner, setEditingPartner] = useState<AdminPartnerSummary | null>(null);
  const [editStatus, setEditStatus] = useState<AffiliatePartnerStatus>('active');
  const [editQuarterCount, setEditQuarterCount] = useState<number>(0);
  const [editFreeEndDate, setEditFreeEndDate] = useState<string>('');

  const filteredPartners = partners.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.partnerName.toLowerCase().includes(q) ||
      p.referralCode.toLowerCase().includes(q) ||
      (p.pixKey || '').toLowerCase().includes(q)
    );
  });

  const totalAvailableGlobal = partners.reduce((acc, p) => acc + p.availableBalance, 0);
  const totalPendingGlobal = partners.reduce((acc, p) => acc + p.pendingBalance, 0);
  const totalPaidGlobal = partners.reduce((acc, p) => acc + p.paidBalance, 0);

  const openPayoutModalForPartner = (partner?: AdminPartnerSummary) => {
    const target = partner || partners[0];
    if (target) {
      setSelectedPartnerId(target.id);
      setPayoutAmount(target.availableBalance > 0 ? target.availableBalance.toFixed(2) : '');
    }
    setReceiptUrl('');
    setPayoutNotes('');
    setIsPayoutModalOpen(true);
  };

  const handlePartnerChangeInPayoutModal = (newPartnerId: string) => {
    setSelectedPartnerId(newPartnerId);
    const found = partners.find((p) => p.id === newPartnerId);
    if (found && found.availableBalance > 0) {
      setPayoutAmount(found.availableBalance.toFixed(2));
    } else {
      setPayoutAmount('');
    }
  };

  const handleRegisterPayout = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const targetPartner = partners.find((p) => p.id === selectedPartnerId);

    startTransition(async () => {
      try {
        await registerAffiliatePayoutAction({
          orgId,
          partnerId: selectedPartnerId,
          amount: Number(payoutAmount),
          receiptUrl,
          notes: payoutNotes,
          commissionIds: targetPartner?.availableCommissionIds,
        });
        setIsPayoutModalOpen(false);
        setFeedback({
          type: 'success',
          text: 'Repasse registrado com sucesso! As comissões disponíveis foram marcadas como pagas.',
        });
      } catch (err: any) {
        setFeedback({
          type: 'error',
          text: err?.message || 'Erro ao registrar repasse.',
        });
      }
    });
  };

  const handleRegisterCommission = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      try {
        await registerReferralAndCommissionAction({
          orgId,
          partnerId: commPartnerId,
          planSlug: commPlanSlug,
          cycle: commCycle,
          netAmountBeforeGatewayFees: Number(commNetAmount),
          commissionStatus: commStatus,
        });
        setIsCommissionModalOpen(false);
        setFeedback({
          type: 'success',
          text: `Indicação e comissão (${commCycle === 'yearly' ? '25%' : '20%'}) registradas com sucesso!`,
        });
      } catch (err: any) {
        setFeedback({
          type: 'error',
          text: err?.message || 'Erro ao lançar comissão.',
        });
      }
    });
  };

  const handleReleaseCommission = (commissionId: string) => {
    setFeedback(null);
    startTransition(async () => {
      try {
        await updateCommissionStatusAction({
          orgId,
          commissionId,
          status: 'available',
        });
        setFeedback({
          type: 'success',
          text: 'Comissão liberada como Disponível para Repasse!',
        });
      } catch (err: any) {
        setFeedback({
          type: 'error',
          text: err?.message || 'Erro ao liberar comissão.',
        });
      }
    });
  };

  const handleSavePartnerSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    setFeedback(null);

    startTransition(async () => {
      try {
        await updatePartnerAdminSettingsAction({
          orgId,
          partnerId: editingPartner.id,
          status: editStatus,
          currentQuarterPaidReferrals: editQuarterCount,
          freeMonthsEndDate: editFreeEndDate || null,
        });
        setEditingPartner(null);
        setFeedback({
          type: 'success',
          text: 'Meta trimestral e gratuidade atualizadas com sucesso!',
        });
      } catch (err: any) {
        setFeedback({
          type: 'error',
          text: err?.message || 'Erro ao atualizar dados da parceira.',
        });
      }
    });
  };

  const previewPercentage = commCycle === 'yearly' ? 25 : 20;
  const previewCommission = Number(
    (((Number(commNetAmount) || 0) * previewPercentage) / 100).toFixed(2)
  );

  return (
    <div className="space-y-8">
      {/* Cabeçalho da Titular */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#E6E1D8] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6C0F37]/10 text-[#6C0F37] text-xs font-bold uppercase tracking-wider mb-2">
            <span>👑 Administração Exclusiva da Titular</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2B2426] tracking-tight">
            Gestão Conexão Fikra (Parceiras & Afiliadas)
          </h1>
          <p className="text-sm text-[#6F6865] mt-1">
            Gerencie parceiras cadastradas, aprove repasses via PIX com comprovante e acompanhe as
            metas trimestrais de gratuidade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/professor/affiliates?org=${orgId}`}
            className="px-4 py-2.5 rounded-xl border border-[#E6E1D8] bg-white hover:bg-[#F7F4ED] text-[#2B2426] text-xs font-semibold transition-colors"
          >
            ← Ver Área da Parceira
          </Link>
          <button
            type="button"
            onClick={() => {
              if (partners[0]) setCommPartnerId(partners[0].id);
              setIsCommissionModalOpen(true);
            }}
            disabled={partners.length === 0}
            className="px-4 py-2.5 rounded-xl border border-[#6C0F37] text-[#6C0F37] hover:bg-[#6C0F37]/5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            + Lançar Indicação / Comissão
          </button>
          <button
            type="button"
            onClick={() => openPayoutModalForPartner()}
            disabled={partners.length === 0}
            className="px-5 py-2.5 rounded-xl bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            💸 Registrar Repasse
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline ml-4 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cards de Resumo Consolidado da Titular */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6F6865]">
            Parceiras Cadastradas
          </span>
          <p className="text-2xl font-bold text-[#2B2426] mt-2">{partners.length}</p>
          <p className="text-xs text-[#6F6865] mt-1">
            {partners.filter((p) => p.status === 'active').length} ativa(s) no programa
          </p>
        </div>

        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Aguardando Liquidação (Asaas)
          </span>
          <p className="text-2xl font-bold text-amber-700 mt-2">
            {formatBRL(totalPendingGlobal)}
          </p>
          <p className="text-xs text-[#6F6865] mt-1">Comissões com status pendente</p>
        </div>

        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Saldo Disponível para Repasse
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            {formatBRL(totalAvailableGlobal)}
          </p>
          <p className="text-xs text-[#6F6865] mt-1">Pronto para transferência PIX</p>
        </div>

        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6C0F37]">
            Total Já Repassado
          </span>
          <p className="text-2xl font-bold text-[#6C0F37] mt-2">
            {formatBRL(totalPaidGlobal)}
          </p>
          <p className="text-xs text-[#6F6865] mt-1">{payouts.length} comprovante(s) emitido(s)</p>
        </div>
      </div>

      {/* Abas de Navegação do Painel da Titular */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E1D8] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#6C0F37] text-white'
                : 'bg-white border border-[#E6E1D8] text-[#6F6865] hover:text-[#2B2426]'
            }`}
          >
            1. Visão Geral de Parceiras
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'payouts'
                ? 'bg-[#6C0F37] text-white'
                : 'bg-white border border-[#E6E1D8] text-[#6F6865] hover:text-[#2B2426]'
            }`}
          >
            2. Gestão de Repasses & Comissões
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('goals')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'goals'
                ? 'bg-[#6C0F37] text-white'
                : 'bg-white border border-[#E6E1D8] text-[#6F6865] hover:text-[#2B2426]'
            }`}
          >
            3. Acompanhamento de Metas & Gratuidade
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar parceira, código ou PIX..."
            className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D8] bg-white text-xs text-[#2B2426] focus:outline-none focus:border-[#6C0F37]"
          />
        </div>
      </div>

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === 'overview' && (
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#2B2426]">
                Parceiras Cadastradas no Conexão Fikra
              </h2>
              <p className="text-xs text-[#6F6865]">
                Listagem completa de códigos de afiliada, chaves PIX, saldos disponíveis e ações de
                repasse.
              </p>
            </div>
          </div>

          {filteredPartners.length === 0 ? (
            <div className="py-12 text-center bg-[#FAF8F5] rounded-xl border border-dashed border-[#E6E1D8]">
              <p className="text-sm font-semibold text-[#2B2426]">
                Nenhuma parceira encontrada
              </p>
              <p className="text-xs text-[#6F6865] mt-1">
                Assim que os docentes acessarem a página Conexão Fikra, seus códigos aparecerão
                aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E6E1D8] text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                    <th className="py-3 pr-3">Parceira</th>
                    <th className="py-3 px-3">Código</th>
                    <th className="py-3 px-3">Chave PIX</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Pendente</th>
                    <th className="py-3 px-3">Disponível</th>
                    <th className="py-3 px-3">Total Pago</th>
                    <th className="py-3 pl-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1D8]/70 text-sm">
                  {filteredPartners.map((partner) => (
                    <tr key={partner.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3.5 pr-3">
                        <span className="font-semibold text-[#2B2426] block">
                          {partner.partnerName}
                        </span>
                        {partner.partnerEmail && (
                          <span className="text-xs text-[#6F6865]">{partner.partnerEmail}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#F7F4ED] text-[#6C0F37]">
                          {partner.referralCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs text-[#2B2426]">
                        {partner.pixKey || <span className="text-[#6F6865] italic">Não cadastrada</span>}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            partner.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {partner.status === 'active' ? 'Ativa' : partner.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-amber-700 font-medium">
                        {formatBRL(partner.pendingBalance)}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-emerald-700">
                        {formatBRL(partner.availableBalance)}
                      </td>
                      <td className="py-3.5 px-3 font-medium text-[#6C0F37]">
                        {formatBRL(partner.paidBalance)}
                      </td>
                      <td className="py-3.5 pl-3 text-right">
                        <button
                          type="button"
                          onClick={() => openPayoutModalForPartner(partner)}
                          className="px-3 py-1.5 rounded-lg bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Registrar Repasse
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: GESTÃO DE REPASSES & COMISSÕES */}
      {activeTab === 'payouts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Comissões (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#2B2426]">
                  Comissões Geradas (20% Mensal / 25% Anual)
                </h3>
                <p className="text-xs text-[#6F6865]">
                  Comissões calculadas sobre o valor líquido recebido (antes das taxas do gateway).
                </p>
              </div>
            </div>

            {commissions.length === 0 ? (
              <div className="py-10 text-center bg-[#FAF8F5] rounded-xl border border-dashed border-[#E6E1D8]">
                <p className="text-sm font-semibold text-[#2B2426]">
                  Nenhuma comissão lançada ainda
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6E1D8] text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                      <th className="py-3 pr-2">Parceira</th>
                      <th className="py-3 px-2">Base / %</th>
                      <th className="py-3 px-2">Comissão</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 pl-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E1D8]/70 text-sm">
                    {commissions.map((comm) => (
                      <tr key={comm.id} className="hover:bg-[#FAF8F5]">
                        <td className="py-3 pr-2">
                          <span className="font-semibold text-[#2B2426] block">
                            {comm.partnerName}
                          </span>
                          <span className="text-[11px] text-[#6F6865]">
                            {formatDateBR(comm.createdAt)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-[#6F6865]">
                          {formatBRL(comm.grossAmount)} ({comm.commissionPercentage}%)
                        </td>
                        <td className="py-3 px-2 font-bold text-[#2B2426]">
                          {formatBRL(comm.commissionAmount)}
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              comm.status === 'paid'
                                ? 'bg-[#6C0F37]/10 text-[#6C0F37]'
                                : comm.status === 'available'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {comm.status === 'paid'
                              ? 'Pago'
                              : comm.status === 'available'
                              ? 'Disponível'
                              : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 pl-2 text-right">
                          {comm.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleReleaseCommission(comm.id)}
                              disabled={isPending}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                            >
                              Liberar Saldo
                            </button>
                          )}
                          {comm.status === 'available' && (
                            <button
                              type="button"
                              onClick={() => {
                                const p = partners.find((item) => item.id === comm.partnerId);
                                openPayoutModalForPartner(p);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold cursor-pointer"
                            >
                              Repassar
                            </button>
                          )}
                          {comm.status === 'paid' && comm.transferReceiptUrl && (
                            <a
                              href={comm.transferReceiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-[#6C0F37] underline"
                            >
                              Recibo
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Coluna Histórico de Repasses Efetuados (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-[#2B2426] mb-1">
              Histórico de Repasses Registrados
            </h3>
            <p className="text-xs text-[#6F6865] mb-4">
              Transferências liquidadas pela titular em `affiliate_payouts`.
            </p>

            {payouts.length === 0 ? (
              <div className="py-10 text-center bg-[#FAF8F5] rounded-xl border border-dashed border-[#E6E1D8]">
                <p className="text-sm font-semibold text-[#2B2426]">
                  Nenhum repasse registrado
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6E1D8] text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                      <th className="py-3 pr-2">Parceira / Data</th>
                      <th className="py-3 px-2">Valor Pago</th>
                      <th className="py-3 pl-2 text-right">Comprovante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E1D8]/70 text-sm">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAF8F5]">
                        <td className="py-3 pr-2">
                          <span className="font-semibold text-[#2B2426] block">
                            {p.partnerName}
                          </span>
                          <span className="text-[11px] text-[#6F6865]">
                            {formatDateBR(p.paidAt)}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-bold text-emerald-700">
                          {formatBRL(p.amount)}
                        </td>
                        <td className="py-3 pl-2 text-right">
                          {p.receiptUrl ? (
                            <a
                              href={p.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-[#6C0F37] underline"
                            >
                              Ver comprovante
                            </a>
                          ) : (
                            <span className="text-xs text-[#6F6865]">Sem anexo</span>
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
      )}

      {/* ABA 3: ACOMPANHAMENTO DE METAS & GRATUIDADE */}
      {activeTab === 'goals' && (
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#2B2426]">
              Monitoramento de Metas Trimestrais & Expiração de Gratuidade
            </h2>
            <p className="text-xs text-[#6F6865]">
              Cada 5 novas indicações pagantes no trimestre renovam 3 meses de gratuidade para a
              parceira.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6E1D8] text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                  <th className="py-3 pr-3">Parceira</th>
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3">Progresso no Trimestre</th>
                  <th className="py-3 px-3">Expiração da Gratuidade</th>
                  <th className="py-3 pl-3 text-right">Gerenciar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1D8]/70 text-sm">
                {filteredPartners.map((partner) => {
                  const count = partner.currentQuarterPaidReferrals || 0;
                  const cycleCount = count % 5 === 0 && count > 0 ? 5 : count % 5;
                  const pct = Math.min(100, Math.round((cycleCount / 5) * 100));

                  return (
                    <tr key={partner.id} className="hover:bg-[#FAF8F5]">
                      <td className="py-3.5 pr-3 font-semibold text-[#2B2426]">
                        {partner.partnerName}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs text-[#6C0F37] font-bold">
                        {partner.referralCode}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3 max-w-xs">
                          <div className="flex-1 h-2.5 bg-[#F7F4ED] border border-[#E6E1D8] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#6C0F37] rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-[#2B2426]">
                            {cycleCount}/5 ({count} total)
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        {partner.freeMonthsEndDate ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                            Até {formatDateBR(partner.freeMonthsEndDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-[#6F6865]">Sem gratuidade ativa</span>
                        )}
                      </td>
                      <td className="py-3.5 pl-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPartner(partner);
                            setEditStatus(partner.status);
                            setEditQuarterCount(partner.currentQuarterPaidReferrals);
                            setEditFreeEndDate(
                              partner.freeMonthsEndDate
                                ? partner.freeMonthsEndDate.split('T')[0]
                                : ''
                            );
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[#E6E1D8] hover:border-[#6C0F37] text-xs font-semibold text-[#2B2426] hover:text-[#6C0F37] cursor-pointer"
                        >
                          Ajustar Meta / Gratuidade
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CENTRALIZADO: REGISTRAR REPASSE */}
      {isPayoutModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setIsPayoutModalOpen(false)}
        >
          <div
            className="bg-white border border-[#E6E1D8] rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#2B2426]">
                  Registrar Repasse de Afiliada
                </h3>
                <p className="text-xs text-[#6F6865]">
                  Cria o registro em `affiliate_payouts` e marca as comissões disponíveis como
                  `paid`.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F7F4ED] text-[#6F6865] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6865] mb-1.5">
                  Selecionar Parceira
                </label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => handlePartnerChangeInPayoutModal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-sm text-[#2B2426] focus:outline-none focus:border-[#6C0F37]"
                  required
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.partnerName} ({p.referralCode}) — Disponível:{' '}
                      {formatBRL(p.availableBalance)}
                    </option>
                  ))}
                </select>
                {(() => {
                  const sel = partners.find((p) => p.id === selectedPartnerId);
                  return sel ? (
                    <p className="text-xs text-[#6F6865] mt-1.5">
                      Chave PIX cadastrada:{' '}
                      <strong className="font-mono text-[#2B2426]">
                        {sel.pixKey || 'Não informada'}
                      </strong>
                    </p>
                  ) : null;
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6865] mb-1.5">
                  Valor Pago (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-sm text-[#2B2426] focus:outline-none focus:border-[#6C0F37]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6865] mb-1.5">
                  URL do Comprovante de Transferência (Opcional)
                </label>
                <input
                  type="url"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-sm text-[#2B2426] focus:outline-none focus:border-[#6C0F37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6865] mb-1.5">
                  Observações / Identificador PIX
                </label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Ex: Repasse PIX ref. comissões de Outubro"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-sm text-[#2B2426] focus:outline-none focus:border-[#6C0F37]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E6E1D8] text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Registrando...' : 'Confirmar Repasse & Baixar Comissões'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CENTRALIZADO: LANÇAR INDICAÇÃO E COMISSÃO */}
      {isCommissionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setIsCommissionModalOpen(false)}
        >
          <div
            className="bg-white border border-[#E6E1D8] rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#2B2426]">
                  Lançar Indicação & Comissão
                </h3>
                <p className="text-xs text-[#6F6865]">
                  Cálculo automático: 20% no Plano Mensal | 25% no Plano Anual.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCommissionModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F7F4ED] text-[#6F6865] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterCommission} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6865] mb-1.5">
                  Parceira Indicadora
                </label>
                <select
                  value={commPartnerId}
                  onChange={(e) => setCommPartnerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-sm text-[#2B2426]"
                  required
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.partnerName} ({p.referralCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6865] mb-1.5">
                    Plano Contratado
                  </label>
                  <select
                    value={commPlanSlug}
                    onChange={(e) => setCommPlanSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-sm text-[#2B2426]"
                  >
                    <option value="starter">Plano Starter</option>
                    <option value="pro">Plano Pro</option>
                    <option value="school">Plano School / Equipe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6865] mb-1.5">
                    Ciclo do Contrato
                  </label>
                  <select
                    value={commCycle}
                    onChange={(e) => setCommCycle(e.target.value as AffiliatePlanCycle)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-sm text-[#2B2426]"
                  >
                    <option value="monthly">Mensal (Comissão 20%)</option>
                    <option value="yearly">Anual (Comissão 25%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6865] mb-1.5">
                    Valor Líquido Recebido (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={commNetAmount}
                    onChange={(e) => setCommNetAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-sm text-[#2B2426]"
                    required
                  />
                  <span className="text-[11px] text-[#6F6865]">
                    Líquido de descontos e antes das taxas do gateway
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6865] mb-1.5">
                    Status Inicial da Comissão
                  </label>
                  <select
                    value={commStatus}
                    onChange={(e) => setCommStatus(e.target.value as AffiliateCommissionStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-sm text-[#2B2426]"
                  >
                    <option value="available">Disponível para repasse</option>
                    <option value="pending">Pendente (aguardando Asaas)</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7F4ED] border border-[#E6E1D8] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#2B2426]">
                  Comissão calculada ({previewPercentage}%):
                </span>
                <span className="text-base font-extrabold text-[#6C0F37]">
                  {formatBRL(previewCommission)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCommissionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E6E1D8] text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Salvando...' : 'Confirmar Indicação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CENTRALIZADO: AJUSTAR META & GRATUIDADE */}
      {editingPartner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setEditingPartner(null)}
        >
          <div
            className="bg-white border border-[#E6E1D8] rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-3">
              <h3 className="text-lg font-bold text-[#2B2426]">
                Meta & Gratuidade — {editingPartner.partnerName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPartner(null)}
                className="w-8 h-8 rounded-full hover:bg-[#F7F4ED] text-[#6F6865] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePartnerSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6865] mb-1.5">
                  Status da Parceira
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as AffiliatePartnerStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-sm text-[#2B2426]"
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                  <option value="suspended">Suspensa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6865] mb-1.5">
                  Indicações Pagantes no Trimestre Atual
                </label>
                <input
                  type="number"
                  min="0"
                  value={editQuarterCount}
                  onChange={(e) => setEditQuarterCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-sm text-[#2B2426]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6865] mb-1.5">
                  Data Limite da Gratuidade (3 meses grátis)
                </label>
                <input
                  type="date"
                  value={editFreeEndDate}
                  onChange={(e) => setEditFreeEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-sm text-[#2B2426]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPartner(null)}
                  className="px-4 py-2 rounded-xl border border-[#E6E1D8] text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
