import { createUsuario } from '~/server/core/usuarios/usuario.usecases'
import { eixoRepository } from '~/server/repository/eixo.repository.drizzle'
import { usuarioRepository } from '~/server/repository/usuario.repository.drizzle'
import { passwordSetupTokenRepository } from '~/server/repository/passwordSetupToken.repository.drizzle'

/**
 * Seed de homologação/demo: banco limpo, sem dados fictícios de teste — só o mínimo
 * pra cliente conseguir entrar e começar a cadastrar o resto pelo próprio sistema.
 * Diferente de `seed.ts` (dev), cria o usuário via `createUsuario` de verdade, então
 * ele passa pelo fluxo real de e-mail de definição de senha (não vem com senha pronta).
 * Diretoria não precisa de eixo — acesso total, sem vínculo, então nem cria um eixo placeholder.
 */
async function seedHomolog() {
  const email = process.env.HOMOLOG_ADMIN_EMAIL
  if (!email) throw new Error('Defina HOMOLOG_ADMIN_EMAIL com o e-mail do usuário admin antes de rodar este seed.')

  console.log('Seed de homologação: 1 usuário (Diretoria)...')

  const admin = await createUsuario(usuarioRepository, eixoRepository, passwordSetupTokenRepository, {
    nome: process.env.HOMOLOG_ADMIN_NOME ?? 'Administrador',
    email,
    modo: 'convite',
    perfil: 'diretoria',
    eixoId: null,
  })

  console.log(`Seed concluído: usuário "${admin.nome}" <${admin.email}> (perfil Diretoria).`)
  console.log('E-mail de definição de senha enviado (ou logado no console do servidor, se RESEND_API_KEY não estiver configurada).')
}

seedHomolog()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
