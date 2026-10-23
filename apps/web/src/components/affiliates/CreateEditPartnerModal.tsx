'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  adminCreatePartnerAction,
  adminUpdatePartnerCouponAction,
  searchProfilesAction,
} from '../../actions/affiliates';
import type { AdminPartnerSummary } from './AffiliateAdminClient';
import type { AffiliatePartnerStatus } from '../../types/database';

interface CreateEditPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  partnerToEdit?: AdminPartnerSummary | null;
  onSuccess: (msg: string) => void;
}

export function CreateEditPartnerModal({
  isOpen,
  onClose,
  orgId,
  partnerToEdit,
  onSuccess,
}: CreateEditPartnerModalProps) {
  const isEditing = !!partnerToEdit;

  // Modo de seleção de conta (para nova parceira)
  const [creationMode, setCreationMode] = useState<'existing' | 'invite'>('existing');
  const [profileSearchQuery, setProfileSearchQuery] = useState('');
  const [profileSearchResults, setProfileSearchResults] = useState<
    Array<{ id: string; full_name: string; email: string }>
  >([]);
  const [selectedProfile, setSelectedProfile] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [isSearchingProfiles, startSearchingProfiles] = useTransition();

  // Dados de convite por e-mail
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  // Configuração do Cupom Promocional
  const [referralCode, setReferralCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [validPlans, setValidPlans] = useState<'both' | 'monthly' | 'yearly'>('both');
  const [durationType, setDurationType] = useState<'first_charge' | 'multiple_months' | 'lifetime'>('first_charge');
  const [durationMonths, setDurationMonths] = useState<number>(3);

  // Validade e Limites
  const [hasExpiration, setHasExpiration] = useState<boolean>(false);
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [hasMaxRedemptions, setHasMaxRedemptions] = useState<boolean>(false);
  const [maxRedemptions, setMaxRedemptions] = useState<number>(50);
  const [allowStacking, setAllowStacking] = useState<boolean>(false);
  const [status, setStatus] = useState<AffiliatePartnerStatus>('active');
  const [pixKey, setPixKey] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    if (partnerToEdit) {
      setReferralCode(partnerToEdit.referralCode);
      setDiscountType(partnerToEdit.discountType || 'percentage');
      setDiscountValue(partnerToEdit.discountValue || 20);
      setValidPlans(partnerToEdit.validPlans || 'both');
      setDurationType(partnerToEdit.durationType || 'first_charge');
      setDurationMonths(partnerToEdit.durationMonths || 3);
      setHasExpiration(!!partnerToEdit.expirationDate);
      setExpirationDate(partnerToEdit.expirationDate ? partnerToEdit.expirationDate.split('T')[0] : '');
      setHasMaxRedemptions(partnerToEdit.maxRedemptions !== null && partnerToEdit.maxRedemptions !== undefined);
      setMaxRedemptions(partnerToEdit.maxRedemptions || 50);
      setAllowStacking(partnerToEdit.allowStacking || false);
      setStatus(partnerToEdit.status || 'active');
      setPixKey(partnerToEdit.pixKey || '');
    } else {
      // Padrões para novo cadastro
      setCreationMode('existing');
      setProfileSearchQuery('');
      setProfileSearchResults([]);
      setSelectedProfile(null);
      setInviteName('');
      setInviteEmail('');
      setReferralCode('');
      setDiscountType('percentage');
      setDiscountValue(20);
      setValidPlans('both');
      setDurationType('first_charge');
      setDurationMonths(3);
      setHasExpiration(false);
      setExpirationDate('');
      setHasMaxRedemptions(false);
      setMaxRedemptions(50);
      setAllowStacking(false);
      setStatus('active');
      setPixKey('');
    }
  }, [isOpen, partnerToEdit]);

  // Busca profiles com debounce
  const handleSearchProfiles = (q: string) => {
    setProfileSearchQuery(q);
    if (!q || q.trim().length < 2) {
      setProfileSearchResults([]);
      return;
    }
    startSearchingProfiles(async () => {
      const res = await searchProfilesAction(q);
      if (res.success) {
        setProfileSearchResults(res.profiles || []);
      }
    });
  };

  const handleSelectProfile = (p: { id: string; full_name: string; email: string }) => {
    setSelectedProfile(p);
    setProfileSearchResults([]);
    setProfileSearchQuery('');
    if (!referralCode) {
      const cleanName = (p.full_name || 'PARCEIRA')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 6);
      setReferralCode(`${cleanName || 'FIKRA'}2026`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = referralCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode || cleanCode.length < 2) {
      setErrorMsg('O código promocional deve conter pelo menos 2 caracteres alfanuméricos.');
      return;
    }

    if (discountValue <= 0) {
      setErrorMsg('Informe um valor de desconto válido.');
      return;
    }

    startTransition(async () => {
      if (isEditing && partnerToEdit) {
        const res = await adminUpdatePartnerCouponAction({
          orgId,
          partnerId: partnerToEdit.id,
          referralCode: cleanCode,
          discountType,
          discountValue: Number(discountValue),
          validPlans,
          durationType,
          durationMonths: durationType === 'multiple_months' ? Number(durationMonths) : null,
          expirationDate: hasExpiration && expirationDate ? `${expirationDate}T23:59:59Z` : null,
          maxRedemptions: hasMaxRedemptions && maxRedemptions ? Number(maxRedemptions) : null,
          allowStacking,
          status,
          pixKey: pixKey.trim() || null,
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Erro ao atualizar cupom.');
        } else {
          onSuccess(`Regras do cupom "${cleanCode}" atualizadas com sucesso!`);
          onClose();
        }
      } else {
        // Criação de nova parceira
        const res = await adminCreatePartnerAction({
          orgId,
          referralCode: cleanCode,
          profileId: creationMode === 'existing' ? selectedProfile?.id : undefined,
          inviteName: creationMode === 'invite' ? inviteName : undefined,
          inviteEmail: creationMode === 'invite' ? inviteEmail : undefined,
          discountType,
          discountValue: Number(discountValue),
          validPlans,
          durationType,
          durationMonths: durationType === 'multiple_months' ? Number(durationMonths) : null,
          expirationDate: hasExpiration && expirationDate ? `${expirationDate}T23:59:59Z` : null,
          maxRedemptions: hasMaxRedemptions && maxRedemptions ? Number(maxRedemptions) : null,
          allowStacking,
          status,
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Erro ao cadastrar parceira.');
        } else {
          onSuccess(`Parceira e cupom "${cleanCode}" cadastrados com sucesso!`);
          onClose();
        }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div
        className="w-[94vw] max-w-[1400px] h-[90vh] max-h-[90vh] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="shrink-0 border-b border-[#E6E1D8] p-6 bg-white flex items-center justify-between z-20">
          <div className="text-left">
            <span className="text-[11px] font-bold tracking-wider text-[#6C0F37] uppercase bg-[#F3E8EC] px-2.5 py-0.5 rounded border border-[#6C0F37]/20 inline-block">
              Parceiras
            </span>
            <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
              {isEditing ? 'Configurar cupom e regras' : 'Cadastrar nova parceira e cupom'}
            </h1>
            <p className="text-xs text-[#6F6865] mt-0.5 text-left">
              {isEditing
                ? `Editando parâmetros de "${partnerToEdit?.partnerName}" (${partnerToEdit?.referralCode}). Afeta apenas novas contratações.`
                : 'Defina a conta da parceira e configure as regras promocionais exclusivas.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="w-9 h-9 rounded-xl text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E6E1D8] flex items-center justify-center font-semibold text-lg transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Formulário com corpo e rodapé */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6 scroll-smooth">
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                ⚠️ {errorMsg}
              </div>
            )}
          {/* SEÇÃO 1: VINCULAÇÃO DE CONTA (Apenas em criação) */}
          {!isEditing && (
            <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-4 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37] block">
                1. Pessoa Parceira
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreationMode('existing')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    creationMode === 'existing'
                      ? 'bg-[#6C0F37] text-white shadow-xs'
                      : 'bg-white border border-[#E6E1D8] text-[#6F6865]'
                  }`}
                >
                  Conta existente na plataforma
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('invite')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    creationMode === 'invite'
                      ? 'bg-[#6C0F37] text-white shadow-xs'
                      : 'bg-white border border-[#E6E1D8] text-[#6F6865]'
                  }`}
                >
                  Convidar por Nome + E-mail
                </button>
              </div>

              {creationMode === 'existing' ? (
                <div className="space-y-2">
                  {selectedProfile ? (
                    <div className="p-3 bg-white border border-emerald-300 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-[#2B2426] block">
                          {selectedProfile.full_name}
                        </span>
                        <span className="text-[11px] text-[#6F6865]">{selectedProfile.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedProfile(null)}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold underline cursor-pointer"
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={profileSearchQuery}
                        onChange={(e) => handleSearchProfiles(e.target.value)}
                        placeholder="Digite o nome ou e-mail da pessoa..."
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E6E1D8] bg-white focus:outline-none focus:border-[#6C0F37]"
                      />
                      {isSearchingProfiles && (
                        <span className="absolute right-3 top-2.5 text-[10px] text-[#6F6865]">
                          Buscando...
                        </span>
                      )}

                      {profileSearchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E6E1D8] rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-[#E6E1D8]">
                          {profileSearchResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectProfile(p)}
                              className="w-full text-left p-2.5 hover:bg-[#FAF8F5] transition-colors flex justify-between items-center cursor-pointer"
                            >
                              <span className="text-xs font-bold text-[#2B2426]">{p.full_name}</span>
                              <span className="text-[11px] text-[#6F6865]">{p.email}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                      Nome da Parceira
                    </label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Ex: Mariana Silva"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E1D8] bg-white focus:outline-none focus:border-[#6C0F37]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                      E-mail de Convite
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="mariana@email.com"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E1D8] bg-white focus:outline-none focus:border-[#6C0F37]"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO 2: CÓDIGO PROMOCIONAL EXCLUSIVO */}
          <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-4 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37] block">
              2. Código Promocional Único
            </span>
            <div>
              <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                Cupom / Código (Único no sistema)
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Ex: MARIA2026"
                className="w-full px-3.5 py-2.5 font-mono text-sm font-extrabold uppercase rounded-xl border border-[#E6E1D8] bg-white focus:outline-none focus:border-[#6C0F37]"
                required
              />
              <span className="text-[10px] text-[#6F6865] mt-1 block">
                Cada código pertence estritamente a uma única pessoa parceira e é utilizado no checkout.
              </span>
            </div>
          </div>

          {/* SEÇÃO 3: REGRAS DE BENEFÍCIO DO CUPOM */}
          <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-4 space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37] block">
              3. Benefício & Desconto
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tipo de Desconto */}
              <div>
                <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                  Tipo de Desconto
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E1D8] bg-white focus:outline-none focus:border-[#6C0F37]"
                >
                  <option value="percentage">Percentual (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
              </div>

              {/* Valor do Desconto */}
              <div>
                <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                  Valor do Desconto ({discountType === 'percentage' ? '%' : 'R$'})
                </label>
                <input
                  type="number"
                  step={discountType === 'percentage' ? '1' : '0.50'}
                  min="1"
                  max={discountType === 'percentage' ? '100' : '9999'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E1D8] bg-white focus:outline-none focus:border-[#6C0F37]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Planos Elegíveis */}
              <div>
                <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                  Planos Elegíveis
                </label>
                <select
                  value={validPlans}
                  onChange={(e) => setValidPlans(e.target.value as 'both' | 'monthly' | 'yearly')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E1D8] bg-white focus:outline-none focus:border-[#6C0F37]"
                >
                  <option value="both">Ambos (Mensal e Anual)</option>
                  <option value="monthly">Apenas Plano Mensal</option>
                  <option value="yearly">Apenas Plano Anual</option>
                </select>
              </div>

              {/* Duração do Benefício */}
              <div>
                <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                  Duração do Benefício
                </label>
                <select
                  value={durationType}
                  onChange={(e) =>
                    setDurationType(
                      e.target.value as 'first_charge' | 'multiple_months' | 'lifetime'
                    )
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E1D8] bg-white focus:outline-none focus:border-[#6C0F37]"
                >
                  <option value="first_charge">Apenas na 1ª cobrança</option>
                  <option value="multiple_months">Por número de meses/cobranças</option>
                  <option value="lifetime">Vitalício / Durante toda a vigência</option>
                </select>
              </div>
            </div>

            {durationType === 'multiple_months' && (
              <div>
                <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                  Número de Meses / Cobranças com Desconto
                </label>
                <input
                  type="number"
                  min="2"
                  max="48"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(parseInt(e.target.value, 10) || 3)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E1D8] bg-white focus:outline-none focus:border-[#6C0F37]"
                />
              </div>
            )}
          </div>

          {/* SEÇÃO 4: VALIDADE E LIMITES */}
          <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-4 space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37] block">
              4. Validade, Limites & Status
            </span>

            {/* Expiração */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-has-exp"
                  checked={!hasExpiration}
                  onChange={(e) => setHasExpiration(!e.target.checked)}
                  className="rounded text-[#6C0F37] focus:ring-[#6C0F37]"
                />
                <label htmlFor="chk-has-exp" className="text-xs font-semibold text-[#2B2426] cursor-pointer">
                  Sem data de expiração (válido por tempo indeterminado)
                </label>
              </div>
              {hasExpiration && (
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E1D8] bg-white focus:outline-none focus:border-[#6C0F37]"
                  required={hasExpiration}
                />
              )}
            </div>

            {/* Limite de Usos */}
            <div className="space-y-2 pt-2 border-t border-[#E6E1D8]">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-has-max"
                  checked={!hasMaxRedemptions}
                  onChange={(e) => setHasMaxRedemptions(!e.target.checked)}
                  className="rounded text-[#6C0F37] focus:ring-[#6C0F37]"
                />
                <label htmlFor="chk-has-max" className="text-xs font-semibold text-[#2B2426] cursor-pointer">
                  Sem limite de uso (utilizações ilimitadas)
                </label>
              </div>
              {hasMaxRedemptions && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                    Quantidade máxima de utilizações
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E1D8] bg-white focus:outline-none focus:border-[#6C0F37]"
                    required={hasMaxRedemptions}
                  />
                </div>
              )}
            </div>

            {/* Acumular com outras ofertas & Status */}
            <div className="pt-2 border-t border-[#E6E1D8] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-stacking"
                  checked={allowStacking}
                  onChange={(e) => setAllowStacking(e.target.checked)}
                  className="rounded text-[#6C0F37] focus:ring-[#6C0F37]"
                />
                <label htmlFor="chk-stacking" className="text-xs font-semibold text-[#2B2426] cursor-pointer">
                  Permitir acumular com outras ofertas
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                  Status do Cupom
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AffiliatePartnerStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E1D8] bg-white focus:outline-none focus:border-[#6C0F37]"
                >
                  <option value="active">Ativo (Permite novas contratações)</option>
                  <option value="suspended">Suspenso / Desativado</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>

            {isEditing && (
              <div className="pt-2 border-t border-[#E6E1D8]">
                <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                  Chave PIX Cadastrada para Repasses
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Ex: CPF, CNPJ, E-mail ou Celular"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E1D8] bg-white focus:outline-none focus:border-[#6C0F37]"
                />
              </div>
            )}
          </div>
        </div>

          {/* Rodapé Fixo na Base */}
          <div className="shrink-0 border-t border-[#E6E1D8] p-4 bg-white flex justify-end gap-3 z-20">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 hover:shadow-md active:scale-[0.98]"
            >
              {isPending
                ? 'Salvando regras...'
                : isEditing
                ? 'Salvar alterações do cupom'
                : 'Concluir cadastro da parceira'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
