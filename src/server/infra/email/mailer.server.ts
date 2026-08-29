import { Resend } from 'resend'
import { env } from '~/server/infra/config/env.server'

interface SendPasswordSetupEmailInput {
  to: string
  nome: string
  link: string
}

function passwordSetupHtml({ nome, link }: { nome: string; link: string }): string {
  return `
    <p>Olá, ${nome},</p>
    <p>Clique no link abaixo para definir sua senha de acesso ao Gestão de Entregas:</p>
    <p><a href="${link}">${link}</a></p>
    <p>Se você não esperava este e-mail, pode ignorá-lo.</p>
  `
}

export async function sendPasswordSetupEmail({ to, nome, link }: SendPasswordSetupEmailInput): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.info(`[mailer] RESEND_API_KEY não configurada — link de definição de senha para ${to}:\n${link}`)
    return
  }

  const resend = new Resend(env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM,
    to: [to],
    subject: 'Defina sua senha — Gestão de Entregas',
    html: passwordSetupHtml({ nome, link }),
  })
  if (error) {
    // Sem isso, uma falha de envio (ex.: conta Resend em sandbox, só entrega pro próprio
    // e-mail da conta) perde o link de vez — o token já existe no banco, mas ninguém o vê.
    console.error(`[mailer] Falha ao enviar e-mail via Resend — link de definição de senha para ${to}:\n${link}\nErro:`, error)
  }
}
