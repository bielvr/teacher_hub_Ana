-- Migration: 20261019000004_affiliate_coupons_and_logs.sql
-- Adiciona suporte avançado a cupons, snapshot imutável em indicações e auditoria de logs de tentativa

-- 1. Garante que referral_code seja único e case-insensitive na busca
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_partners_referral_code_key'
  ) THEN
    ALTER TABLE public.affiliate_partners ADD CONSTRAINT affiliate_partners_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

-- 2. Adiciona colunas de configuração avançada do cupom em affiliate_partners
ALTER TABLE public.affiliate_partners
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  ADD COLUMN IF NOT EXISTS discount_value numeric(10,2) NOT NULL DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS valid_plans text NOT NULL DEFAULT 'both' CHECK (valid_plans IN ('monthly', 'yearly', 'both')),
  ADD COLUMN IF NOT EXISTS duration_type text NOT NULL DEFAULT 'first_charge' CHECK (duration_type IN ('first_charge', 'multiple_months', 'lifetime')),
  ADD COLUMN IF NOT EXISTS duration_months integer,
  ADD COLUMN IF NOT EXISTS start_date timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expiration_date timestamptz,
  ADD COLUMN IF NOT EXISTS max_redemptions integer,
  ADD COLUMN IF NOT EXISTS current_redemptions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_stacking boolean NOT NULL DEFAULT false;

-- 3. Adiciona colunas de snapshot imutável em affiliate_referrals
ALTER TABLE public.affiliate_referrals
  ADD COLUMN IF NOT EXISTS original_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS discount_applied numeric(10,2),
  ADD COLUMN IF NOT EXISTS final_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS discount_type text,
  ADD COLUMN IF NOT EXISTS discount_value numeric(10,2),
  ADD COLUMN IF NOT EXISTS duration_type text,
  ADD COLUMN IF NOT EXISTS duration_months integer;

-- 4. Criação da tabela de auditoria e tentativas de cupom se não existir
CREATE TABLE IF NOT EXISTS public.affiliate_coupon_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Garante que todas as colunas necessárias existam mesmo se a tabela já existia previamente
ALTER TABLE public.affiliate_coupon_logs
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.affiliate_partners(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS buyer_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attempt_status text NOT NULL DEFAULT 'attempt',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS plan_chosen text,
  ADD COLUMN IF NOT EXISTS cycle_chosen text,
  ADD COLUMN IF NOT EXISTS discount_calculated numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Índices para performance e consultas analíticas
CREATE INDEX IF NOT EXISTS idx_affiliate_partners_code ON public.affiliate_partners(UPPER(referral_code));
CREATE INDEX IF NOT EXISTS idx_affiliate_coupon_logs_partner_id ON public.affiliate_coupon_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_coupon_logs_created_at ON public.affiliate_coupon_logs(created_at DESC);

-- Habilita RLS na tabela de logs
ALTER TABLE public.affiliate_coupon_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'affiliate_coupon_logs' AND policyname = 'affiliate_coupon_logs_select'
  ) THEN
    CREATE POLICY affiliate_coupon_logs_select ON public.affiliate_coupon_logs
      FOR SELECT TO authenticated
      USING (
        buyer_profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE profile_id = auth.uid() AND role = 'owner'
        )
        OR EXISTS (
          SELECT 1 FROM public.affiliate_partners
          WHERE id = affiliate_coupon_logs.partner_id AND profile_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'affiliate_coupon_logs' AND policyname = 'affiliate_coupon_logs_insert'
  ) THEN
    CREATE POLICY affiliate_coupon_logs_insert ON public.affiliate_coupon_logs
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
