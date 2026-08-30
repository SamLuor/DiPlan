import { eq } from 'drizzle-orm'
import { db } from './client'
import { anexos, eixos, entregas, notas, planos, usuarios } from './schema'
import { hashPassword } from '~/server/infra/auth/password.server'

/** Mesmos dados de `src/lib/seedData.ts`, agora persistidos no Postgres. */
async function seed() {
  console.log('Seeding...')

  const [comercial, ti, operacoes] = await db
    .insert(eixos)
    .values([{ nome: 'Comercial' }, { nome: 'TI' }, { nome: 'Operações' }])
    .returning()

  const defaultSenhaHash = await hashPassword('trocar123')

  const [marina, diego, carlos, julia, paulo] = await db
    .insert(usuarios)
    .values([
      { nome: 'Marina Reis', email: 'marina.reis@empresa.com', modo: 'senha', senhaHash: defaultSenhaHash, eixoId: comercial!.id },
      { nome: 'Diego Alves', email: 'diego.alves@empresa.com', modo: 'convite', senhaHash: null, eixoId: comercial!.id },
      { nome: 'Carlos Nunes', email: 'carlos.nunes@empresa.com', modo: 'senha', senhaHash: defaultSenhaHash, eixoId: ti!.id },
      { nome: 'Julia Prado', email: 'julia.prado@empresa.com', modo: 'senha', senhaHash: defaultSenhaHash, eixoId: ti!.id },
      { nome: 'Paulo Costa', email: 'paulo.costa@empresa.com', modo: 'convite', senhaHash: null, eixoId: operacoes!.id },
    ])
    .returning()

  await db.update(eixos).set({ chefiaUserId: marina!.id }).where(eq(eixos.id, comercial!.id))
  await db.update(eixos).set({ chefiaUserId: carlos!.id }).where(eq(eixos.id, ti!.id))
  await db.update(eixos).set({ chefiaUserId: paulo!.id }).where(eq(eixos.id, operacoes!.id))

  const [plano1, plano2, plano3, plano4] = await db
    .insert(planos)
    .values([
      { nome: 'Expansão de Contas 2026', eixoId: comercial!.id, status: 'execucao', dataInicio: '2026-08-01', dataFim: '2026-10-31' },
      { nome: 'Infraestrutura 2026', eixoId: ti!.id, status: 'execucao', dataInicio: '2026-08-01', dataFim: '2026-09-30' },
      { nome: 'Produtos Digitais', eixoId: ti!.id, status: 'planejado', dataInicio: '2026-09-01', dataFim: '2026-12-31' },
      { nome: 'Eficiência Operacional 2026', eixoId: operacoes!.id, status: 'concluido', dataInicio: '2026-06-01', dataFim: '2026-07-31' },
    ])
    .returning()

  const entregasSeed = await db
    .insert(entregas)
    .values([
      { titulo: 'Apresentação institucional para conta XPTO', planoId: plano1!.id, dataInicio: '2026-08-28', dataPrevista: '2026-09-05', prioridade: 'alta', responsavelUserId: marina!.id, situacao: 'aguardando' },
      { titulo: 'Revisão de contrato — Cliente Fortaleza', planoId: plano1!.id, dataPrevista: '2026-08-20', prioridade: 'normal', situacao: 'andamento' },
      { titulo: 'Renovação carteira setor varejo', planoId: plano1!.id, dataPrevista: '2026-10-01', prioridade: 'baixa', responsavelUserId: diego!.id, situacao: 'aguardando' },
      { titulo: 'Proposta comercial — Grupo Almeida', planoId: plano1!.id, dataPrevista: '2026-08-10', prioridade: 'urgente', responsavelUserId: marina!.id, situacao: 'concluida' },
      { titulo: 'Follow-up leads feira setorial', planoId: plano1!.id, dataPrevista: '2026-09-15', prioridade: 'normal', situacao: 'andamento' },
      { titulo: 'Migração de servidores para nuvem', planoId: plano2!.id, dataInicio: '2026-08-15', dataPrevista: '2026-08-22', prioridade: 'urgente', responsavelUserId: carlos!.id, situacao: 'andamento' },
      { titulo: 'Atualização de firewall', planoId: plano2!.id, dataPrevista: '2026-09-10', prioridade: 'alta', situacao: 'aguardando' },
      { titulo: 'Backup redundante — site secundário', planoId: plano2!.id, dataPrevista: '2026-07-30', prioridade: 'normal', responsavelUserId: carlos!.id, situacao: 'concluida' },
      { titulo: 'Monitoramento de rede 24x7', planoId: plano2!.id, dataPrevista: '2026-11-01', prioridade: 'normal', responsavelUserId: julia!.id, situacao: 'aguardando' },
      { titulo: 'Lançamento app mobile v2', planoId: plano3!.id, dataInicio: '2026-09-08', dataPrevista: '2026-09-20', prioridade: 'alta', responsavelUserId: julia!.id, situacao: 'andamento' },
      { titulo: 'Correção de bugs críticos — portal do cliente', planoId: plano3!.id, dataPrevista: '2026-08-25', prioridade: 'urgente', situacao: 'andamento' },
      { titulo: 'Testes de performance API', planoId: plano3!.id, dataPrevista: '2026-10-15', prioridade: 'baixa', responsavelUserId: carlos!.id, situacao: 'aguardando' },
      { titulo: 'Documentação técnica v2', planoId: plano3!.id, dataPrevista: '2026-08-01', prioridade: 'baixa', situacao: 'concluida' },
      { titulo: 'Reorganização do estoque central', planoId: plano4!.id, dataPrevista: '2026-09-30', prioridade: 'normal', responsavelUserId: paulo!.id, situacao: 'aguardando' },
      { titulo: 'Auditoria de processos logísticos', planoId: plano4!.id, dataInicio: '2026-08-05', dataPrevista: '2026-08-15', prioridade: 'alta', situacao: 'andamento' },
      { titulo: 'Treinamento equipe de expedição', planoId: plano4!.id, dataPrevista: '2026-07-20', prioridade: 'normal', responsavelUserId: paulo!.id, situacao: 'concluida' },
      { titulo: 'Redução de custos com transporte', planoId: plano4!.id, dataPrevista: '2026-09-05', prioridade: 'urgente', responsavelUserId: paulo!.id, situacao: 'aguardando' },
    ])
    .returning()

  const [e1, e2, e4, e6, e8, e10, e15, e16] = entregasSeed

  await db.insert(notas).values([
    { entregaId: e2!.id, texto: 'Aguardando retorno do jurídico sobre a cláusula 4.', autor: 'Marina Reis', tipo: 'manual', dataHora: new Date('2026-08-18T14:30:00') },
    { entregaId: e2!.id, texto: 'Jurídico aprovou com ajustes menores.', autor: 'Marina Reis', tipo: 'manual', dataHora: new Date('2026-08-22T09:10:00') },
    { entregaId: e4!.id, texto: 'Proposta enviada.', autor: 'Marina Reis', tipo: 'manual', dataHora: new Date('2026-08-05T10:00:00') },
    { entregaId: e4!.id, texto: 'Cliente pediu revisão de valores.', autor: 'Marina Reis', tipo: 'manual', dataHora: new Date('2026-08-07T16:20:00') },
    { entregaId: e4!.id, texto: 'Fechado. Contrato assinado.', autor: 'Marina Reis', tipo: 'manual', dataHora: new Date('2026-08-10T11:45:00') },
    { entregaId: e6!.id, texto: 'Ambiente de homologação migrado com sucesso.', autor: 'Carlos Nunes', tipo: 'manual', dataHora: new Date('2026-08-19T08:00:00') },
    { entregaId: e6!.id, texto: 'Produção agendada, aguardando janela de manutenção.', autor: 'Carlos Nunes', tipo: 'manual', dataHora: new Date('2026-08-24T17:00:00') },
    { entregaId: e8!.id, texto: 'Backup validado e funcionando.', autor: 'Carlos Nunes', tipo: 'manual', dataHora: new Date('2026-07-30T13:00:00') },
    { entregaId: e10!.id, texto: 'Build de homologação disponível para testes.', autor: 'Julia Prado', tipo: 'manual', dataHora: new Date('2026-08-20T11:00:00') },
    { entregaId: e15!.id, texto: 'Visita ao centro de distribuição concluída.', autor: 'Paulo Costa', tipo: 'manual', dataHora: new Date('2026-08-12T09:00:00') },
    { entregaId: e15!.id, texto: 'Relatório preliminar em elaboração.', autor: 'Paulo Costa', tipo: 'manual', dataHora: new Date('2026-08-16T15:30:00') },
    { entregaId: e16!.id, texto: 'Treinamento realizado com toda a equipe.', autor: 'Paulo Costa', tipo: 'manual', dataHora: new Date('2026-07-20T17:00:00') },
  ])

  // Anexos de seed são só decorativos — o `key` não aponta pra um objeto real no S3,
  // então "baixar" um desses no dev vai falhar (URL pré-assinada pra uma chave inexistente).
  await db.insert(anexos).values([
    { entregaId: e1!.id, nome: 'apresentacao-xpto.pdf', key: 'seed/apresentacao-xpto.pdf', contentType: 'application/pdf', tamanho: 245_000 },
    { entregaId: e4!.id, nome: 'proposta-almeida-v3.pdf', key: 'seed/proposta-almeida-v3.pdf', contentType: 'application/pdf', tamanho: 189_000 },
    { entregaId: e6!.id, nome: 'plano-migracao.xlsx', key: 'seed/plano-migracao.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', tamanho: 56_000 },
    { entregaId: e10!.id, nome: 'checklist-lancamento.pdf', key: 'seed/checklist-lancamento.pdf', contentType: 'application/pdf', tamanho: 98_000 },
    { entregaId: e15!.id, nome: 'relatorio-auditoria.docx', key: 'seed/relatorio-auditoria.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', tamanho: 312_000 },
  ])

  console.log('Seed concluído.')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
