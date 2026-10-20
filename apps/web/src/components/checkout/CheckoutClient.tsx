'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { validateCouponAction, completeSubscriptionCheckoutAction } from '../../actions/affiliates';

export interface PlanOption {
  slug: string;
  name: string;
  priceMonthly: number;
  priceYearly: number; // Valor anual total
  installmentYearly: number; // Parcela mensal no anual
  studentsLimit: number;
  teachersLimit: number;
  popular?: boolean;
}

const DEFAULT_PLANS: PlanOption[] = [
  {
    slug: 'fikra-essencial',
    name: 'Fikra Essencial',
    priceMonthly: 69.90,
    priceYearly: 754.92,
    installmentYearly: 62.91,
    studentsLimit: 20,
    teachersLimit: 1,
  },
  {
    slug: 'fikra-pro',
    name: 'Fikra Pro',
    priceMonthly: 119.90,
    priceYearly: 1294.92,
    installmentYearly: 107.91,
    studentsLimit: 50,
    teachersLimit: 3,
    popular: true,
  },
  {
    slug: 'fikra-equipe',
    name: 'Fikra Equipe',
    priceMonthly: 179.90,
    priceYearly: 1942.92,
    installmentYearly: 161.91,
    studentsLimit: 100,
    teachersLimit: 6,
  },
];

interface CheckoutClientProps {
  initialPlanSlug?: string;
  initialCycle?: 'monthly' | 'yearly';
  initialCoupon?: string;
  currentUserId?: string;
  currentUserEmail?: string;
  currentUserName?: string;
}

export function CheckoutClient({
  initialPlanSlug = 'fikra-pro',
  initialCycle = 'monthly',
  initialCoupon = '',
  currentUserId,
  currentUserEmail = '',
  currentUserName = '',
}: CheckoutClientProps) {
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>(initialPlanSlug);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>(initialCycle);

  // Form de dados pessoais
  const [name, setName] = useState(currentUserName);
  const [email, setEmail] = useState(currentUserEmail);
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');

  // Cupom e Validação
  const [couponInput, setCouponInput] = useState(initialCoupon);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount: number;
    finalAmount: number;
    durationType: 'first_charge' | 'multiple_months' | 'lifetime';
    durationMonths?: number | null;
    durationNotice?: string;
  } | null>(null);

  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, startValidatingCoupon] = useTransition();

  // Conclusão da Contratação
  const [isSubmitting, startSubmitting] = useTransition();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [orderCompleted, setOrderCompleted] = useState<{
    success: boolean;
    planName: string;
    cycle: string;
    finalAmount: number;
    referralId?: string;
  } | null>(null);

  const currentPlan =
    DEFAULT_PLANS.find((p) => p.slug === selectedPlanSlug) || DEFAULT_PLANS[1];

  const originalPrice =
    selectedCycle === 'monthly' ? currentPlan.priceMonthly : currentPlan.priceYearly;

  // Validação automática se initialCoupon veio preenchido
  useEffect(() => {
    if (initialCoupon && initialCoupon.trim()) {
      handleApplyCoupon(initialCoupon.trim());
    }
  }, []);

  const handleApplyCoupon = (codeToTest?: string) => {
    const code = (codeToTest || couponInput).trim().toUpperCase();
    setCouponError(null);

    if (!code) {
      setAppliedCoupon(null);
      return;
    }

    startValidatingCoupon(async () => {
      const result = await validateCouponAction({
        referralCode: code,
        planSlug: selectedPlanSlug,
        cycle: selectedCycle,
        originalAmount: originalPrice,
        buyerProfileId: currentUserId,
      });

      if (!result.success) {
        setAppliedCoupon(null);
        setCouponError(result.error || 'Cupom promocional inválido.');
      } else {
        setCouponError(null);
        setAppliedCoupon({
          code: result.referralCode || code,
          discountType: result.discountType || 'percentage',
          discountValue: result.discountValue || 0,
          discountAmount: result.discountAmount || 0,
          finalAmount: result.finalAmount ?? originalPrice,
          durationType: result.durationType || 'first_charge',
          durationMonths: result.durationMonths,
          durationNotice: result.durationNotice,
        });
      }
    });
  };

  const handleRemoveCoupon = () => {
    setCouponInput('');
    setAppliedCoupon(null);
    setCouponError(null);
  };

  // Reavalia cupom se mudar de plano ou ciclo
  useEffect(() => {
    if (appliedCoupon) {
      handleApplyCoupon(appliedCoupon.code);
    }
  }, [selectedPlanSlug, selectedCycle]);

  const finalPriceToPay = appliedCoupon ? appliedCoupon.finalAmount : originalPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!name.trim()) {
      setSubmissionError('Por favor, informe seu nome completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setSubmissionError('Por favor, informe um e-mail válido.');
      return;
    }

    startSubmitting(async () => {
      const res = await completeSubscriptionCheckoutAction({
        planSlug: selectedPlanSlug,
        cycle: selectedCycle,
        originalAmount: originalPrice,
        couponCode: appliedCoupon?.code || undefined,
        customerName: name,
        customerEmail: email,
        cpfCnpj: cpfCnpj.trim() || undefined,
        phone: phone.trim() || undefined,
        buyerProfileId: currentUserId,
      });

      if (!res.success) {
        setSubmissionError(res.error || 'Erro ao processar assinatura.');
      } else {
        setOrderCompleted({
          success: true,
          planName: currentPlan.name,
          cycle: selectedCycle === 'monthly' ? 'Mensal' : 'Anual',
          finalAmount: res.finalAmount ?? finalPriceToPay,
          referralId: res.referralId,
        });
      }
    });
  };

  if (orderCompleted) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white border border-[#E6E1D8] rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
            ✓
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2B2426]">
              Assinatura Confirmada!
            </h1>
            <p className="text-sm text-[#6F6865] mt-2 max-w-md mx-auto">
              Sua contratação do plano <strong>{orderCompleted.planName}</strong> ({orderCompleted.cycle}) foi registrada com sucesso.
            </p>
          </div>

          <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-5 text-left space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6F6865]">Plano contratado:</span>
              <strong className="text-[#2B2426]">{orderCompleted.planName}</strong>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6F6865]">Ciclo de faturamento:</span>
              <strong className="text-[#2B2426]">{orderCompleted.cycle}</strong>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between items-center text-sm text-emerald-700">
                <span>Cupom promocional ({appliedCoupon.code}):</span>
                <strong>- R$ {appliedCoupon.discountAmount.toFixed(2).replace('.', ',')}</strong>
              </div>
            )}
            <div className="pt-2 border-t border-[#E6E1D8] flex justify-between items-center text-base">
              <span className="font-bold text-[#2B2426]">Valor pago agora:</span>
              <span className="font-extrabold text-[#6C0F37] text-xl">
                R$ {orderCompleted.finalAmount.toFixed(2).replace('.', ',')}
              </span>
            </div>
            {appliedCoupon?.durationNotice && (
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-2">
                ⓘ {appliedCoupon.durationNotice}
              </p>
            )}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/professor"
              className="px-6 py-3 rounded-xl bg-[#6C0F37] hover:bg-[#57102E] text-white font-bold text-sm shadow-sm transition-colors"
            >
              Acessar Painel Docente →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-6 mb-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <Image src="/Logo.svg" alt="Fikra" width={110} height={28} className="h-7 w-auto" />
        </Link>
        <span className="text-xs font-semibold text-[#6F6865] flex items-center gap-1.5">
          🔒 Ambiente Seguro de Contratação
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda (7 cols): Escolha do Plano e Formulário do Comprador */}
        <div className="lg:col-span-7 space-y-6">
          {/* Seletor de Ciclo (Mensal / Anual) */}
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C0F37] mb-3">
              1. Ciclo de Cobrança
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedCycle('monthly')}
                className={`py-3 px-4 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  selectedCycle === 'monthly'
                    ? 'border-[#6C0F37] bg-[#6C0F37]/5 text-[#6C0F37] ring-1 ring-[#6C0F37]'
                    : 'border-[#E6E1D8] bg-white text-[#6F6865] hover:bg-[#FAF8F5]'
                }`}
              >
                <span>Plano Mensal</span>
                <span className="text-xs font-normal text-[#6F6865]">Cobrança mês a mês</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCycle('yearly')}
                className={`relative py-3 px-4 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  selectedCycle === 'yearly'
                    ? 'border-[#6C0F37] bg-[#6C0F37]/5 text-[#6C0F37] ring-1 ring-[#6C0F37]'
                    : 'border-[#E6E1D8] bg-white text-[#6F6865] hover:bg-[#FAF8F5]'
                }`}
              >
                <span className="absolute -top-2.5 right-3 bg-[#D7CE36] text-[#6C0F37] text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs">
                  Economize 10%
                </span>
                <span>Plano Anual</span>
                <span className="text-xs font-normal text-[#6F6865]">Parcelado em até 12x</span>
              </button>
            </div>
          </div>

          {/* Cards dos Planos */}
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C0F37] mb-3">
              2. Escolha o Plano
            </h2>
            <div className="space-y-3">
              {DEFAULT_PLANS.map((plan) => {
                const isSelected = plan.slug === selectedPlanSlug;
                const price =
                  selectedCycle === 'monthly'
                    ? `R$ ${plan.priceMonthly.toFixed(2).replace('.', ',')} / mês`
                    : `12x de R$ ${plan.installmentYearly.toFixed(2).replace('.', ',')} (total R$ ${plan.priceYearly.toFixed(2).replace('.', ',')})`;

                return (
                  <div
                    key={plan.slug}
                    onClick={() => setSelectedPlanSlug(plan.slug)}
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#6C0F37] bg-[#FAF8F5] ring-2 ring-[#6C0F37]'
                        : 'border-[#E6E1D8] hover:border-[#6C0F37]/40 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-[#6C0F37]' : 'border-[#C4BEB9]'
                        }`}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 bg-[#6C0F37] rounded-full" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#2B2426]">{plan.name}</span>
                          {plan.popular && (
                            <span className="bg-[#6C0F37] text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                              Mais Escolhido
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#6F6865]">
                          Até {plan.studentsLimit} estudantes • {plan.teachersLimit} docente(s)
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-extrabold text-[#6C0F37]">
                        {price}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dados do Comprador */}
          <form id="checkout-form" onSubmit={handleSubmit} className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C0F37] mb-1">
              3. Dados da Titular / Docente
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#6F6865] mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-[#2B2426] focus:outline-none focus:border-[#6C0F37]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6F6865] mb-1">
                  E-mail de Acesso <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-[#2B2426] focus:outline-none focus:border-[#6C0F37]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6F6865] mb-1">
                  CPF ou CNPJ (opcional)
                </label>
                <input
                  type="text"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-[#2B2426] focus:outline-none focus:border-[#6C0F37]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#6F6865] mb-1">
                  WhatsApp / Celular (opcional)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] text-[#2B2426] focus:outline-none focus:border-[#6C0F37]"
                />
              </div>
            </div>

            {submissionError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl">
                {submissionError}
              </div>
            )}
          </form>
        </div>

        {/* Coluna Direita (5 cols): Resumo do Pedido & Cupom */}
        <div className="lg:col-span-5 space-y-5 sticky top-6">
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-[#2B2426] pb-3 border-b border-[#E6E1D8]">
              Resumo do Pedido
            </h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[#6F6865]">Plano:</span>
                <span className="font-bold text-[#2B2426]">{currentPlan.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6F6865]">Faturamento:</span>
                <span className="font-medium text-[#2B2426]">
                  {selectedCycle === 'monthly' ? 'Mensal' : 'Anual (12x)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6F6865]">Valor tabela:</span>
                <span className="font-medium text-[#2B2426]">
                  R$ {originalPrice.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* SEÇÃO DO CUPOM PROMOCIONAL */}
            <div className="pt-4 border-t border-[#E6E1D8] space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
                Cupom Promocional / Indicação
              </label>

              {!appliedCoupon ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Ex: MARIA2026"
                    className="flex-1 px-3.5 py-2 text-sm uppercase font-mono rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] focus:outline-none focus:border-[#6C0F37]"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={isValidatingCoupon || !couponInput.trim()}
                    className="px-4 py-2 bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    {isValidatingCoupon ? 'Validando...' : 'Aplicar'}
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 text-base">✓</span>
                    <div>
                      <span className="font-mono text-xs font-extrabold text-emerald-900 block">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        Desconto de {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}%` : `R$ ${appliedCoupon.discountValue.toFixed(2)}`} aplicado
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold underline cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  ⚠️ {couponError}
                </p>
              )}

              {appliedCoupon?.durationNotice && (
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  ⓘ <strong>Atenção:</strong> {appliedCoupon.durationNotice}
                </div>
              )}
            </div>

            {/* Total e Desconto */}
            <div className="pt-4 border-t border-[#E6E1D8] space-y-2">
              {appliedCoupon && (
                <div className="flex justify-between items-center text-sm text-emerald-700 font-bold">
                  <span>Desconto aplicado:</span>
                  <span>- R$ {appliedCoupon.discountAmount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-base font-extrabold text-[#2B2426]">Total a pagar agora:</span>
                <span className="text-2xl font-black text-[#6C0F37]">
                  R$ {finalPriceToPay.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Botão de Finalização */}
            <button
              type="submit"
              form="checkout-form"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-[#D7CE36] hover:bg-[#C2B92F] text-[#6C0F37] font-black text-sm uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Processando assinatura...</span>
              ) : (
                <>
                  <span>Confirmar & Contratar Plano</span>
                  <span>→</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-[#6F6865] text-center">
              Ao assinar, você concorda com os termos de uso e política de privacidade da Fikra.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
