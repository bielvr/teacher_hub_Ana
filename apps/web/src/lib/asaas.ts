const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

async function asaasFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
      ...options.headers,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.errors?.[0]?.description || 'Erro na comunicação com o Asaas');
  }
  return data;
}

// 1. Cria ou recupera cliente no Asaas
export async function createAsaasCustomer({
  name,
  email,
  cpfCnpj,
  phone,
}: {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
}) {
  return asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify({ name, email, cpfCnpj, phone, notificationDisabled: false }),
  });
}

// 2. Cria assinatura recorrente atrelada ao plano
export async function createAsaasSubscription({
  customerId,
  value,
  nextDueDate,
  description,
}: {
  customerId: string;
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  description: string;
}) {
  return asaasFetch('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: 'UNDEFINED', // Permite que a cliente escolha PIX, Boleto ou Cartão no checkout
      value,
      nextDueDate,
      cycle: 'MONTHLY',
      description,
    }),
  });
}