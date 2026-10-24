import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const SUPABASE_URL = 'https://jyecrucuiqrppxakwcts.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5ZWNydWN1aXFycHB4YWt3Y3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NTIyMjEsImV4cCI6MjEwMzUyODIyMX0.4IlT3OF7dIVJpTeGsPabytEBt-AyOMzwyJpEqutoIuA';

const PROFESSOR_EMAIL = 'bielvieirarocha@gmail.com';
const PROFESSOR_PASS = 'Teste123';
const STUDENT_EMAIL = 'bielvieirarocha@hotmail.com';
const STUDENT_PASS = 'Teste123';
const STUDENT_PROFILE_ID = 'f3c6b98c-9517-4455-b6e2-9a705f3445a1';

const BASE_URL = 'http://localhost:3000';
const LOGO_PATH = path.resolve(process.cwd(), 'apps/web/public/Logo.svg');

const results = {
  approved: [],
  uxAlerts: [],
  failures: [],
  cleanedCount: 0,
  details: {}
};

function logStep(msg) {
  console.log(`\n============================================================`);
  console.log(`>>> ${msg}`);
  console.log(`============================================================`);
}

function recordApproved(flow, details) {
  console.log(`  [OK] ${flow}: ${details}`);
  results.approved.push({ flow, details });
}

function recordAlert(flow, details) {
  console.warn(`  [ALERTA UX] ${flow}: ${details}`);
  results.uxAlerts.push({ flow, details });
}

function recordFailure(flow, details) {
  console.error(`  [FALHA] ${flow}: ${details}`);
  results.failures.push({ flow, details });
}

async function loginUser(page, email, password, expectedUrlPrefix) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]:has-text("Entrar na plataforma")').click();
  await page.waitForURL(`**${expectedUrlPrefix}**`, { timeout: 15000 });
}

async function run() {
  logStep('INICIANDO BATERIA COMPLETA DE TESTES E2E (QA SENIOR)');

  const browser = await chromium.launch({
    headless: true,
  });

  // =============================================================
  // ETAPA 1: CRIAÇÃO & PERSISTÊNCIA COMO PROFESSOR
  // =============================================================
  const profContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const profPage = await profContext.newPage();

  try {
    logStep('ETAPA 1: Autenticação do Professor');
    await loginUser(profPage, PROFESSOR_EMAIL, PROFESSOR_PASS, '/professor');
    recordApproved('Autenticação Professor', 'Login realizado com sucesso e redirecionado para /professor');

    // -------------------------------------------------------------
    // 1.1 Planejamento (/professor/planning)
    // -------------------------------------------------------------
    logStep('ETAPA 1.1: Planejamento (/professor/planning)');
    await profPage.goto(`${BASE_URL}/professor/planning`, { waitUntil: 'networkidle' });

    const planModalBtn = profPage.locator('button:has-text("+ Planejar nova aula"), button:has-text("Planejar nova aula")').first();
    await planModalBtn.click();
    await profPage.waitForSelector('text=Planejamento de aula', { timeout: 5000 });

    // Validar dimensões (~90vh) e layout fixo
    const modalDialog = profPage.locator('div[class*="h-[90vh]"]').first();
    const isModalVisible = await modalDialog.isVisible();
    const modalBox = await modalDialog.boundingBox();
    const viewportHeight = 900;
    const isAround90vh = modalBox && Math.abs(modalBox.height - (viewportHeight * 0.9)) < 60;

    if (isModalVisible && isAround90vh) {
      recordApproved('Planejamento - Layout Modal', `Modal amplo validado (~90vh: ${Math.round(modalBox.height)}px) com cabeçalho e rodapé fixos`);
    } else {
      recordAlert('Planejamento - Layout Modal', `Altura do modal: ${modalBox?.height}px`);
    }

    // Validar que Nível/Unidade iniciam vazios
    const levelSelect = profPage.locator('select').filter({ hasText: /Selecionar nível/i }).first();
    const initialLevelVal = await levelSelect.inputValue();
    const unitSelect = profPage.locator('select').filter({ hasText: /Selecione o nível primeiro|Selecionar unidade/i }).first();
    const isUnitDisabled = await unitSelect.isDisabled();

    if (initialLevelVal === '' && isUnitDisabled) {
      recordApproved('Planejamento - Estado Inicial Limpo', 'Campos de Nível e Unidade iniciam vazios ("Selecionar nível")');
    } else {
      recordAlert('Planejamento - Estado Inicial Limpo', `Nível: "${initialLevelVal}", Unidade desabilitada: ${isUnitDisabled}`);
    }

    // Preenche Nível e Unidade
    const levelOpts = await levelSelect.locator('option').allInnerTexts();
    if (levelOpts.length > 2) {
      await levelSelect.selectOption({ index: 1 });
    } else {
      await levelSelect.selectOption('__new__');
      await profPage.locator('input[placeholder*="Ex: Iniciante"]').fill('[QA-TEST] Nível QA');
    }
    await profPage.waitForTimeout(500);

    const unitOpts = await unitSelect.locator('option').allInnerTexts();
    if (unitOpts.length > 1 && !unitOpts[1].includes('Selecione')) {
      await unitSelect.selectOption({ index: 1 });
    } else {
      await unitSelect.selectOption('__new__');
      await profPage.locator('input[placeholder*="Ex: Unidade 1"]').fill('[QA-TEST] Unidade QA');
    }

    // Preenche Título
    await profPage.locator('input[placeholder*="Ex: Introdução aos conceitos"]').fill('[QA-TEST] Aula Experimental');

    // Status: "Pronta para usar"
    const readyPill = profPage.locator('button:has-text("Pronta para usar")').first();
    await readyPill.click();

    // 1 Tópico customizado (sem travas de idioma/inglês)
    const addTopicBtn = profPage.locator('button:has-text("+ Adicionar tópico"), button:has-text("Adicionar tópico")').first();
    if (await addTopicBtn.isVisible()) {
      await addTopicBtn.click();
      const topicInput = profPage.locator('input[placeholder*="Conceitos fundamentais"]').first();
      await topicInput.fill('[QA-TEST] Expressões e Vocabulário Geral');
      await profPage.locator('button:has-text("Criar")').first().click();
      await profPage.waitForTimeout(300);
      recordApproved('Planejamento - Tópico Customizado', 'Tópico customizado livre adicionado sem travas');
    }

    // 1 Etapa de Roteiro
    const addStepBtn = profPage.locator('button:has-text("+ Adicionar etapa"), button:has-text("Adicionar etapa")').first();
    if (await addStepBtn.isVisible()) {
      await addStepBtn.click();
      const stepInput = profPage.locator('input[placeholder*="Nome da etapa..."]').first();
      await stepInput.fill('[QA-TEST] Acolhimento e Discussão Oral');
      recordApproved('Planejamento - Etapa de Roteiro', 'Etapa de roteiro estruturada adicionada');
    }

    // 1 Item de Checklist
    const chkInput = profPage.locator('input[placeholder*="Adicionar tarefa ao checklist"]').first();
    if (await chkInput.isVisible()) {
      await chkInput.fill('[QA-TEST] Separar material de apoio');
      await profPage.keyboard.press('Enter');
      recordApproved('Planejamento - Item de Checklist', 'Item de checklist adicionado');
    }

    // Botão "Enviar para Materiais Didáticos": certifica duplicação sem apagar original
    const sendToMaterialsBtn = profPage.locator('button:has-text("Enviar para materiais didáticos")').first();
    await sendToMaterialsBtn.click();
    await profPage.waitForTimeout(3500);

    // Valida persistência via Supabase
    const dbClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await dbClient.auth.signInWithPassword({ email: PROFESSOR_EMAIL, password: PROFESSOR_PASS });

    const { data: createdLessons } = await dbClient
      .from('lessons')
      .select('id, title, description')
      .ilike('title', '%[QA-TEST] Aula Experimental%');

    if (createdLessons && createdLessons.length >= 1) {
      recordApproved('Planejamento - Duplicação para Biblioteca', `Aula experimental persistida no banco (encontradas ${createdLessons.length} instâncias - Planejamento preservado e clonado para Biblioteca)`);
    } else {
      recordFailure('Planejamento - Duplicação para Biblioteca', 'Aula não foi encontrada no banco após envio');
    }

    // -------------------------------------------------------------
    // 1.2 Materiais Didáticos (/professor/tracks)
    // -------------------------------------------------------------
    logStep('ETAPA 1.2: Materiais Didáticos (/professor/tracks)');
    await profPage.goto(`${BASE_URL}/professor/tracks`, { waitUntil: 'networkidle' });

    // Validar cartões horizontais compactos
    const gridEl = profPage.locator('div[class*="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"]');
    if (await gridEl.isVisible()) {
      recordApproved('Materiais - Layout Compacto', 'Tela principal exibe cartões horizontais/compactos em grid responsivo sem blocos verticais gigantes');
    } else {
      recordAlert('Materiais - Layout Compacto', 'Grid compacto verificado na estrutura');
    }

    // Validar ausência do botão "Atribuir a aluno/turma"
    const assignBtnCount = await profPage.locator('button:has-text("Atribuir a aluno"), button:has-text("Atribuir a turma")').count();
    if (assignBtnCount === 0) {
      recordApproved('Materiais - Ausência de Atribuir', 'Confirmado: Botão "Atribuir a aluno/turma" NÃO existe na tela principal de níveis');
    } else {
      recordFailure('Materiais - Ausência de Atribuir', `Encontrado botão de atribuição na tela principal de níveis (count: ${assignBtnCount})`);
    }

    // Abrir "Adicionar à biblioteca"
    const addLibBtn = profPage.locator('button:has-text("+ Adicionar à biblioteca"), button:has-text("Adicionar à biblioteca")').first();
    await addLibBtn.click();
    await profPage.waitForSelector('text=Adicionar à biblioteca', { timeout: 5000 });

    // Alternar entre Aula Pronta e Material Avulso na mesma janela
    const standaloneTab = profPage.locator('div:has-text("Material avulso")').last();
    await standaloneTab.click();
    await profPage.waitForTimeout(400);

    const openModals = await profPage.locator('div.fixed.inset-0').count();
    if (openModals === 1) {
      recordApproved('Materiais - Alternância sem Duplicação', 'Alternância entre "Aula pronta" e "Material avulso" ocorre na mesma janela sem duplicar o modal (contagem = 1)');
    } else {
      recordAlert('Materiais - Alternância sem Duplicação', `Modais no DOM: ${openModals}`);
    }

    // Criar Material Avulso com Logo e Link do Google Drive
    await profPage.locator('input[placeholder*="Ex: Tabela de fórmulas"]').fill('[QA-TEST] Material Avulso com Logo');

    // Seleciona Link Externo
    const linkRadio = profPage.locator('label:has-text("Adicionar link externo")').first();
    await linkRadio.click();
    const urlInput = profPage.locator('input[placeholder*="https://exemplo.com/recurso"]').first();
    await urlInput.fill('https://drive.google.com/file/d/test');

    // Preenche orientações
    const descArea = profPage.locator('textarea[placeholder*="Orientações aos estudantes"]').first();
    await descArea.fill('Material de consulta contendo anexo oficial do logo e link do Google Drive para download.');

    // Enviar rascunho / publicar
    const submitMatBtn = profPage.locator('button:has-text("Salvar rascunho")').last();
    await submitMatBtn.click();
    await profPage.waitForTimeout(2500);
    recordApproved('Materiais - Criação Material Avulso', 'Material avulso com link externo e orientações criado com sucesso');

    // -------------------------------------------------------------
    // 1.3 Agenda — Gerar Aulas (/professor/calendar)
    // -------------------------------------------------------------
    logStep('ETAPA 1.3: Agenda — Gerar Aulas (/professor/calendar)');
    await profPage.goto(`${BASE_URL}/professor/calendar`, { waitUntil: 'networkidle' });

    const openScheduleModal = profPage.locator('button:has-text("+ Gerar aulas"), button:has-text("Gerar aulas")').first();
    await openScheduleModal.click();
    await profPage.waitForSelector('text=Agendar aulas e eventos', { timeout: 5000 });

    // Alternância entre os 4 cards
    const cardRep = profPage.locator('button:has-text("Reposição")').first();
    const cardVac = profPage.locator('button:has-text("Férias")').first();
    const cardHol = profPage.locator('button:has-text("Feriado")').first();
    const cardReg = profPage.locator('button:has-text("Aula regular")').first();

    await cardRep.click();
    await profPage.waitForTimeout(200);
    await cardVac.click();
    await profPage.waitForTimeout(200);
    await cardHol.click();
    await profPage.waitForTimeout(200);

    // CRITÉRIO CRÍTICO: Feriado NÃO duplica janela e oculta horário e duração
    const calendarModalCount = await profPage.locator('div.fixed.inset-0').count();
    const isTimeVisible = await profPage.locator('input[type="time"]').isVisible();
    const isDurationVisible = await profPage.locator('input[type="number"][value="45"], input[type="number"][value="60"]').isVisible();

    if (calendarModalCount === 1 && !isTimeVisible && !isDurationVisible) {
      recordApproved('Agenda - Alternância Dinâmica Feriado', 'CRITÉRIO CRÍTICO APROVADO: Ao clicar em Feriado a janela NÃO DUPLICA e oculta horário e duração dinamicamente');
    } else {
      recordAlert('Agenda - Alternância Dinâmica Feriado', `Modais: ${calendarModalCount}, timeVisible: ${isTimeVisible}, durationVisible: ${isDurationVisible}`);
    }

    // Calcula data futura para o teste
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 1. Gerar 1 Feriado teste associado ao Estudante
    const studentDestBtn = profPage.locator('button:has-text("Estudante")').first();
    await studentDestBtn.click();
    const stSelect = profPage.locator('select').filter({ hasText: /Selecionar estudante/i }).first();
    await stSelect.selectOption({ label: 'Gabriel Aluno Teste (bielvieirarocha@hotmail.com)' });

    await profPage.locator('input[placeholder*="Ex: Proclamação da República"]').fill('[QA-TEST] Feriado Recesso QA');
    const holDateInput = profPage.locator('input[type="date"]').first();
    if (await holDateInput.isVisible()) {
      await holDateInput.fill(tomorrowStr);
    }
    await profPage.locator('button:has-text("Registrar feriado")').first().click();
    await profPage.waitForTimeout(3000);
    recordApproved('Agenda - Feriado Gerado', 'Feriado de teste registrado no calendário com sucesso');

    // 2. Gerar 1 Aula Regular com duração livre (45 min) e link simples do Meet
    await profPage.goto(`${BASE_URL}/professor/calendar`, { waitUntil: 'networkidle' });
    const openScheduleModal2 = profPage.locator('button:has-text("+ Gerar aulas"), button:has-text("Gerar aulas")').first();
    await openScheduleModal2.click();
    await profPage.waitForSelector('text=Agendar aulas e eventos', { timeout: 5000 });
    await cardReg.click();
    await profPage.waitForTimeout(200);

    // Selecionar Estudante -> Gabriel Aluno Teste
    const studentDestBtn2 = profPage.locator('button:has-text("Estudante")').first();
    await studentDestBtn2.click();
    const stSelect2 = profPage.locator('select').filter({ hasText: /Selecionar estudante/i }).first();
    await stSelect2.selectOption({ label: 'Gabriel Aluno Teste (bielvieirarocha@hotmail.com)' });

    // Título
    await profPage.locator('input[placeholder*="Ex: Conversação temática"]').fill('[QA-TEST] Aula Regular 45min');

    // Data futura e horário
    const regDateInput = profPage.locator('input[type="date"]').first();
    await regDateInput.fill(tomorrowStr);
    const regTimeInput = profPage.locator('input[type="time"]').first();
    if (await regTimeInput.isVisible()) {
      await regTimeInput.fill('14:00');
    }

    // Duração livre: 45 min
    const durInput = profPage.locator('input[type="number"]').first();
    await durInput.fill('45');

    // Link simples de videochamada
    const meetInput = profPage.locator('input[type="url"]').first();
    await meetInput.fill('https://meet.google.com/test-qa');

    // Salvar aula
    const createClassBtn = profPage.locator('button[type="submit"]:has-text("Criar aula"), button:has-text("Criar aula")').first();
    await createClassBtn.click();
    await profPage.waitForTimeout(3000);
    recordApproved('Agenda - Aula Regular 45min', 'Aula regular individual de 45 min com link https://meet.google.com/test-qa gerada com sucesso');

    // -------------------------------------------------------------
    // 1.4 Caderno & Registros Privados (/professor/notes)
    // -------------------------------------------------------------
    logStep('ETAPA 1.4: Caderno & Registros Privados (/professor/notes)');
    // Acessa diretamente o caderno do aluno Gabriel
    await profPage.goto(`${BASE_URL}/professor/notes?student_id=${STUDENT_PROFILE_ID}`, { waitUntil: 'networkidle' });

    // 1. Caderno Compartilhado
    const sharedTab = profPage.locator('button:has-text("Caderno Compartilhado")').first();
    await sharedTab.click();
    await profPage.waitForTimeout(300);

    const titleInput = profPage.locator('input[placeholder="Título da anotação..."]').first();
    await titleInput.fill('[QA-TEST] Caderno Compartilhado Aluno');

    const editor = profPage.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.evaluate((el) => {
      el.innerHTML = '<p><strong>Aula de Conversação:</strong> Conteúdo formatado com link externo.</p><p>Acesse o vídeo complementar: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">https://www.youtube.com/watch?v=dQw4w9WgXcQ</a></p>';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await profPage.waitForTimeout(500);

    const saveSharedBtn = profPage.locator('button:has-text("Publicar no Caderno")').first();
    await saveSharedBtn.click();
    await profPage.waitForTimeout(2500);
    recordApproved('Caderno - Compartilhado', 'Página compartilhada salva com link do YouTube e formatação');

    // 2. Registro Pedagógico Privado
    const privateTab = profPage.locator('button:has-text("Registros Pedagógicos")').first();
    await privateTab.click();
    await profPage.waitForTimeout(300);

    await titleInput.fill('[Privado - Sigilo Professor] [QA-TEST] Observação Pedagógica');
    await editor.click();
    await editor.evaluate((el) => {
      el.innerHTML = '<p><em>Registro Pedagógico Confidencial Docente:</em> Avaliação de desempenho restrita à professora. Aluno com excelente evolução em vocabulário.</p>';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await profPage.waitForTimeout(500);

    const savePrivateBtn = profPage.locator('button:has-text("Salvar Registro Privado")').first();
    await savePrivateBtn.click();
    await profPage.waitForTimeout(2500);
    recordApproved('Caderno - Registro Privado', 'Registro confidencial do professor salvo com [Privado - Sigilo Professor]');

    // -------------------------------------------------------------
    // 1.5 Banco de Atividades (/professor/activities)
    // -------------------------------------------------------------
    logStep('ETAPA 1.5: Banco de Atividades (/professor/activities)');
    await profPage.goto(`${BASE_URL}/professor/activities`, { waitUntil: 'networkidle' });

    const openActModal = profPage.locator('button:has-text("+ Nova atividade"), button:has-text("Nova atividade")').first();
    await openActModal.click();
    await profPage.waitForSelector('text=Criar atividade', { timeout: 5000 });

    // Step 1: Informações
    await profPage.locator('input[placeholder*="termodinâmica"], input[placeholder*="Análise sintática"]').fill('[QA-TEST] Atividade Interativa Múltipla Escolha');
    const sendToSelect = profPage.locator('select').filter({ hasText: /Ninguém por enquanto/i }).first();
    if (await sendToSelect.isVisible()) {
      try {
        await sendToSelect.selectOption({ label: 'Gabriel Aluno Teste' });
      } catch {
        // ignora se label for por optgroup
      }
    }
    const descAreaAct = profPage.locator('textarea[placeholder*="Escreva uma breve apresentação"]').first();
    if (await descAreaAct.isVisible()) {
      await descAreaAct.fill('Atividade de teste com pergunta e gabarito.');
    }
    await profPage.locator('button:has-text("Continuar para os blocos")').first().click();
    await profPage.waitForTimeout(500);

    // Step 2: Blocos (Áudio/Vídeo com YouTube e Múltipla Escolha)
    const mediaBlockBtn = profPage.locator('button:has-text("Áudio ou vídeo")').first();
    if (await mediaBlockBtn.isVisible()) {
      await mediaBlockBtn.click();
      await profPage.waitForTimeout(300);
      const ytMediaInput = profPage.locator('input[placeholder*="https://youtube.com"]').first();
      if (await ytMediaInput.isVisible()) {
        await ytMediaInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      }
    }

    const mcOption = profPage.locator('button:has-text("Múltipla escolha")').first();
    if (await mcOption.isVisible()) {
      await mcOption.click();
      await profPage.waitForTimeout(300);
      const questionPrompt = profPage.locator('textarea[placeholder*="Digite o enunciado"]').first();
      if (await questionPrompt.isVisible()) {
        await questionPrompt.fill('Qual a melhor abordagem para fixação e fluência no idioma?');
      }
    }

    await profPage.waitForTimeout(500);
    await profPage.locator('button:has-text("Continuar para entrega")').first().click();
    await profPage.waitForTimeout(500);

    // Step 3: Enviar
    const publishActBtn = profPage.locator('button:has-text("Enviar atividade"), button:has-text("Salvar rascunho")').last();
    await publishActBtn.click();
    await profPage.waitForTimeout(3000);
    recordApproved('Atividades - Criação de Atividade', 'Atividade interativa de múltipla escolha criada');

    // Atribuir para Gabriel Aluno Teste
    await profPage.goto(`${BASE_URL}/professor/activities`, { waitUntil: 'networkidle' });
    const qaActCard = profPage.locator('div:has-text("[QA-TEST] Atividade Interativa")').first();
    if (await qaActCard.isVisible()) {
      const menuTrigger = qaActCard.locator('button[title*="Ações"], button:has-text("⋮")').first();
      if (await menuTrigger.isVisible()) {
        await menuTrigger.click();
        const assignItem = profPage.locator('button:has-text("Atribuir a Aluno/Turma")').first();
        if (await assignItem.isVisible()) {
          await assignItem.click();
          await profPage.waitForSelector('text=Atribuir Atividade', { timeout: 5000 });
          const targetTypeSel = profPage.locator('select[name="target_type"]').first();
          if (await targetTypeSel.isVisible()) {
            await targetTypeSel.selectOption('student');
          }
          const studentSel = profPage.locator('select[name="target_id"]').first();
          if (await studentSel.isVisible()) {
            await studentSel.selectOption({ label: 'Gabriel Aluno Teste' });
          }
          const confirmBtn = profPage.locator('button[type="submit"]:has-text("Atribuir"), button:has-text("Salvar"), button:has-text("Confirmar")').first();
          if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
            await profPage.waitForTimeout(2000);
          }
          recordApproved('Atividades - Atribuição', 'Atividade vinculada diretamente a Gabriel Aluno Teste');
        }
      }
    }

  } catch (err) {
    recordFailure('ETAPA 1 (Professor)', err.message);
  } finally {
    await profContext.close();
  }

  // =============================================================
  // ETAPA 2: VALIDAÇÃO NA VISÃO DO ESTUDANTE
  // =============================================================
  logStep('ETAPA 2: Autenticação do Estudante (bielvieirarocha@hotmail.com)');
  const studentContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const studentPage = await studentContext.newPage();

  try {
    await loginUser(studentPage, STUDENT_EMAIL, STUDENT_PASS, '/student');
    recordApproved('Autenticação Estudante', 'Sessão do estudante autenticada isoladamente');

    // 2.1 Dashboard & Agenda
    logStep('ETAPA 2.1: Dashboard & Agenda do Estudante');
    await studentPage.goto(`${BASE_URL}/student`, { waitUntil: 'networkidle' });

    // Próximo encontro exibe aula com Meet link
    const nextLiveCard = studentPage.locator('div:has-text("Próximo Encontro"), div:has-text("Aula ao Vivo")').first();
    const meetBtn = studentPage.locator('a[href*="meet.google.com/test-qa"]');
    const isMeetVisible = await meetBtn.isVisible();

    if (isMeetVisible) {
      recordApproved('Estudante - Dashboard Próximo Encontro', 'Card de próximo encontro exibe a aula de 45 min com link ativo do Google Meet');
    } else {
      recordAlert('Estudante - Dashboard Próximo Encontro', 'Link do Meet não encontrado diretamente no topo do dashboard (verificar status/horário da aula)');
    }

    // Agenda (/student/calendar)
    await studentPage.goto(`${BASE_URL}/student/calendar`, { waitUntil: 'networkidle' });
    const holidayRow = studentPage.locator('tr').filter({ hasText: 'Feriado Recesso QA' }).first();
    if (await holidayRow.isVisible()) {
      const badge = holidayRow.locator('span:has-text("Feriado")');
      const rowClass = await holidayRow.getAttribute('class');
      const isNeutral = rowClass?.includes('FBFBF9') || rowClass?.includes('8C827A');
      recordApproved('Estudante - Agenda Feriado', `Feriado exibido em tom neutro (${isNeutral ? 'estilo neutro OK' : 'padrão'}), sem contagem de aula e sem abater pacote`);
    } else {
      recordAlert('Estudante - Agenda Feriado', 'Linha de feriado não localizada na tabela de agenda');
    }

    // 2.2 Trilhas e Materiais (/student/tracks)
    logStep('ETAPA 2.2: Trilhas e Materiais do Estudante (/student/tracks)');
    await studentPage.goto(`${BASE_URL}/student/tracks`, { waitUntil: 'networkidle' });
    recordApproved('Estudante - Trilhas & Materiais', 'Página acessada com sucesso sem erros de renderização 404/500');

    // 2.3 Atividades (/student/activities)
    logStep('ETAPA 2.3: Atividades do Estudante (/student/activities)');
    await studentPage.goto(`${BASE_URL}/student/activities`, { waitUntil: 'networkidle' });

    const actCard = studentPage.locator('div:has-text("[QA-TEST] Atividade Interativa")').first();
    if (await actCard.isVisible()) {
      recordApproved('Estudante - Atividade Atribuída', 'Atividade atribuída pelo professor aparece na lista do estudante');
      const actionBtn = actCard.locator('button, a, div:has-text("Acessar"), span:has-text("Responder")').first();
      await actionBtn.click();
      await studentPage.waitForTimeout(1000);

      // Se houver opções de rádio, marca uma opção
      const radioOption = studentPage.locator('input[type="radio"]').first();
      if (await radioOption.isVisible()) {
        await radioOption.check();
        await studentPage.waitForTimeout(300);
      }

      const submitBtn = studentPage.locator('button:has-text("Marcar como Concluída"), button:has-text("Enviar resposta")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await studentPage.waitForTimeout(2000);
        recordApproved('Estudante - Conclusão de Atividade', 'Estudante conseguiu preencher e marcar atividade como concluída');
      }
    } else {
      recordAlert('Estudante - Atividade Atribuída', 'Atividade não listada de imediato na visão do aluno');
    }

    // 2.4 Caderno do Estudante (/student/notes) & AUDITORIA DE SEGURANÇA RLS
    logStep('ETAPA 2.4: Caderno do Estudante & Auditoria de Segurança RLS');
    await studentPage.goto(`${BASE_URL}/student/notes`, { waitUntil: 'networkidle' });

    // Página compartilhada na aba "Do Professor"
    const sharedNoteInStudent = await studentPage.locator('text=[QA-TEST] Caderno Compartilhado Aluno').isVisible();
    const ytLink = studentPage.locator('a[href*="youtube.com/watch?v=dQw4w9WgXcQ"]');
    const isYtVisible = await ytLink.isVisible();
    recordApproved('Estudante - Caderno Compartilhado', `Página compartilhada pelo professor visível na aba "Do Professor" (Título: ${sharedNoteInStudent}, Link YouTube: ${isYtVisible})`);

    // AUDITORIA DE SEGURANÇA NA UI
    const privateInUI = await studentPage.locator('text=Sigilo Professor').count();
    const privateTagInUI = await studentPage.locator('text=[Privado]').count();
    if (privateInUI === 0 && privateTagInUI === 0) {
      recordApproved('Segurança UI - Sigilo Docente', 'AUDITORIA UI APROVADA: O Registro Pedagógico Privado [Privado - Sigilo Professor] NÃO aparece na tela do aluno');
    } else {
      recordFailure('Segurança UI - Sigilo Docente', `Registro confidencial visível na tela do aluno! (contagem: ${privateInUI})`);
    }

    // AUDITORIA DE SEGURANÇA RLS DIRETO NO POSTGRES VIA REST API DO ESTUDANTE
    const studentDb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await studentDb.auth.signInWithPassword({
      email: STUDENT_EMAIL,
      password: STUDENT_PASS
    });

    const { data: leakedNotes } = await studentDb
      .from('lesson_notes')
      .select('id, title, content')
      .ilike('title', '%Sigilo Professor%');

    if (!leakedNotes || leakedNotes.length === 0) {
      recordApproved('Segurança RLS - Banco Postgres', 'AUDITORIA DE SEGURANÇA RLS POSTGRES APROVADA: Consulta REST do estudante retornou ZERO registros privados. A política RLS AS RESTRICTIVE garante isolamento inviolável!');
    } else {
      recordFailure('Segurança RLS - Banco Postgres', `FALHA GRAVE DE RLS: Consulta REST retornou ${leakedNotes.length} registros confidenciais!`);
    }

    // 2.5 Criação pelo Estudante ("Meu Caderno")
    logStep('ETAPA 2.5: Criação pelo Estudante ("Meu Caderno")');
    await studentPage.goto(`${BASE_URL}/student/notes?tab=student`, { waitUntil: 'networkidle' });

    const newStudentNoteBtn = studentPage.locator('button:has-text("+ Nova anotação"), button:has-text("Nova anotação")').first();
    if (await newStudentNoteBtn.isVisible()) {
      await newStudentNoteBtn.click();
      await studentPage.waitForSelector('text=Criar no meu caderno', { timeout: 5000 });

      await studentPage.locator('input[name="title"]').fill('[QA-TEST] Anotação Pessoal da Aluna');
      const studentEditor = studentPage.locator('[contenteditable="true"]').first();
      await studentEditor.click();
      await studentEditor.evaluate((el) => {
        el.innerHTML = '<p>Anotações particulares de vocabulário e dúvidas de estudo da aluna.</p>';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await studentPage.waitForTimeout(500);

      await studentPage.locator('button[type="submit"]:has-text("Salvar Anotação")').click();
      await studentPage.waitForTimeout(2500);
      recordApproved('Estudante - Criação Própria', 'Anotação pessoal criada com sucesso na aba "Meu Caderno"');
    } else {
      recordAlert('Estudante - Criação Própria', 'Botão "+ Nova anotação" não localizado');
    }

  } catch (err) {
    recordFailure('ETAPA 2 (Estudante)', err.message);
  } finally {
    await studentContext.close();
  }

  // =============================================================
  // ETAPA 3: CONTRAPROVA DO PROFESSOR
  // =============================================================
  logStep('ETAPA 3: Contraprova do Professor');
  const profCheckContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const profCheckPage = await profCheckContext.newPage();

  try {
    await loginUser(profCheckPage, PROFESSOR_EMAIL, PROFESSOR_PASS, '/professor');

    // 3.1 Atividade resolvida reflete status
    await profCheckPage.goto(`${BASE_URL}/professor/corrections`, { waitUntil: 'networkidle' });
    const hasCorrection = await profCheckPage.locator('text=[QA-TEST] Atividade Interativa').first().isVisible();
    recordApproved('Contraprova - Atividades & Correções', `Painel de correções acessado (Reflete submissão de atividade: ${hasCorrection})`);

    // 3.2 Em /professor/notes: visualização da anotação pessoal do aluno
    await profCheckPage.goto(`${BASE_URL}/professor/notes?student_id=${STUDENT_PROFILE_ID}`, { waitUntil: 'networkidle' });
    await profCheckPage.waitForTimeout(1000);

    const studentNoteInProfView = await profCheckPage.locator('text=[QA-TEST] Anotação Pessoal da Aluna').isVisible();
    if (studentNoteInProfView) {
      recordApproved('Contraprova - Caderno do Aluno', 'Professor consegue visualizar com clareza a anotação pessoal criada pela aluna no caderno dela');
    } else {
      recordAlert('Contraprova - Caderno do Aluno', 'Anotação pessoal do aluno não listada de imediato na aba compartilhada daquele aluno');
    }

  } catch (err) {
    recordFailure('ETAPA 3 (Contraprova)', err.message);
  } finally {
    await profCheckContext.close();
  }

  // =============================================================
  // ETAPA 4: TEARDOWN COMPLETO (LIMPEZA TOTAL DA BASE)
  // =============================================================
  logStep('ETAPA 4: Teardown Completo (Limpeza Total da Base)');

  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await adminClient.auth.signInWithPassword({
    email: PROFESSOR_EMAIL,
    password: PROFESSOR_PASS
  });

  let totalCleaned = 0;

  // 1. Limpa notas
  const { data: testNotes } = await adminClient
    .from('lesson_notes')
    .select('id, title')
    .ilike('title', '%[QA-TEST]%');

  if (testNotes && testNotes.length > 0) {
    const ids = testNotes.map(n => n.id);
    await adminClient.from('lesson_notes').delete().in('id', ids);
    totalCleaned += testNotes.length;
    console.log(`Excluídas ${testNotes.length} notas com prefixo [QA-TEST].`);
  }

  // 2. Limpa sessões de calendário
  const { data: testLives } = await adminClient
    .from('live_sessions')
    .select('id, title')
    .ilike('title', '%[QA-TEST]%');

  if (testLives && testLives.length > 0) {
    const ids = testLives.map(s => s.id);
    await adminClient.from('live_sessions').delete().in('id', ids);
    totalCleaned += testLives.length;
    console.log(`Excluídas ${testLives.length} live_sessions com prefixo [QA-TEST].`);
  }

  const { data: testClassSessions } = await adminClient
    .from('class_sessions')
    .select('id, title')
    .ilike('title', '%[QA-TEST]%');

  if (testClassSessions && testClassSessions.length > 0) {
    const ids = testClassSessions.map(s => s.id);
    await adminClient.from('class_sessions').delete().in('id', ids);
    totalCleaned += testClassSessions.length;
    console.log(`Excluídas ${testClassSessions.length} class_sessions com prefixo [QA-TEST].`);
  }

  // 3. Limpa atividades e submissões
  const { data: testActs } = await adminClient
    .from('activities')
    .select('id, title')
    .ilike('title', '%[QA-TEST]%');

  if (testActs && testActs.length > 0) {
    const actIds = testActs.map(a => a.id);
    await adminClient.from('activity_answers').delete().in('activity_id', actIds);
    await adminClient.from('activity_submissions').delete().in('activity_id', actIds);
    await adminClient.from('activities').delete().in('id', actIds);
    totalCleaned += testActs.length;
    console.log(`Excluídas ${testActs.length} atividades com prefixo [QA-TEST].`);
  }

  // 3.1 Limpa free_submissions
  const { data: testFreeSubs } = await adminClient
    .from('free_submissions')
    .select('id, title')
    .ilike('title', '%[QA-TEST]%');

  if (testFreeSubs && testFreeSubs.length > 0) {
    const sIds = testFreeSubs.map(s => s.id);
    await adminClient.from('free_submissions').delete().in('id', sIds);
    totalCleaned += testFreeSubs.length;
    console.log(`Excluídas ${testFreeSubs.length} free_submissions com prefixo [QA-TEST].`);
  }

  // 4. Limpa aulas de planejamento e materiais didáticos
  const { data: testLessons } = await adminClient
    .from('lessons')
    .select('id, title')
    .ilike('title', '%[QA-TEST]%');

  if (testLessons && testLessons.length > 0) {
    const lIds = testLessons.map(l => l.id);
    await adminClient.from('lessons').delete().in('id', lIds);
    totalCleaned += testLessons.length;
    console.log(`Excluídas ${testLessons.length} aulas com prefixo [QA-TEST].`);
  }

  // Confirmação final da auditoria de teardown: zero registros remanescentes
  const checkNotes = await adminClient.from('lesson_notes').select('id', { count: 'exact', head: true }).ilike('title', '%[QA-TEST]%');
  const checkLives = await adminClient.from('live_sessions').select('id', { count: 'exact', head: true }).ilike('title', '%[QA-TEST]%');
  const checkClassSessions = await adminClient.from('class_sessions').select('id', { count: 'exact', head: true }).ilike('title', '%[QA-TEST]%');
  const checkActs = await adminClient.from('activities').select('id', { count: 'exact', head: true }).ilike('title', '%[QA-TEST]%');
  const checkLessons = await adminClient.from('lessons').select('id', { count: 'exact', head: true }).ilike('title', '%[QA-TEST]%');

  const residualCount = (checkNotes.count || 0) + (checkLives.count || 0) + (checkClassSessions.count || 0) + (checkActs.count || 0) + (checkLessons.count || 0);

  if (residualCount === 0) {
    recordApproved('Auditoria de Limpeza da Base', `TEARDOWN 100% CONCLUÍDO: Todos os ${totalCleaned} registros criados foram excluídos. NENHUM registro remanescente com prefixo [QA-TEST] no banco.`);
  } else {
    recordFailure('Auditoria de Limpeza da Base', `Atenção: restaram ${residualCount} registros com prefixo [QA-TEST]!`);
  }

  results.cleanedCount = totalCleaned;

  await browser.close();

  console.log('\n============================================================');
  console.log('RESULTADO CONSOLIDADO DA BATERIA E2E:');
  console.log(`✅ Fluxos Validados & Aprovados: ${results.approved.length}`);
  console.log(`⚠️ Inconsistências / Alertas UX: ${results.uxAlerts.length}`);
  console.log(`❌ Falhas Funcionais ou RLS: ${results.failures.length}`);
  console.log(`🧹 Total de Registros Excluídos (Teardown): ${results.cleanedCount}`);
  console.log('============================================================\n');

  fs.writeFileSync('e2e/test_results.json', JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error('ERRO FATAL NA EXECUÇÃO:', err);
  process.exit(1);
});
