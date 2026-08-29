export type UserModo = 'senha' | 'convite'

export interface Usuario {
  id: string
  nome: string
  email: string
  modo: UserModo
  eixoId: string
}

/** Só usado internamente pelo fluxo de autenticação — nunca deve sair da camada core/auth. */
export interface UsuarioComSenha extends Usuario {
  senhaHash: string | null
}

export interface NovoUsuarioInput {
  nome: string
  email: string
  modo: UserModo
  senhaHash: string | null
  eixoId: string
}

export interface UsuarioRepository {
  findAll(): Promise<Usuario[]>
  findById(id: string): Promise<Usuario | null>
  findByEixo(eixoId: string): Promise<Usuario[]>
  findByEmailForAuth(email: string): Promise<UsuarioComSenha | null>
  findByIdForAuth(id: string): Promise<UsuarioComSenha | null>
  create(data: NovoUsuarioInput): Promise<Usuario>
  update(id: string, data: NovoUsuarioInput): Promise<Usuario | null>
}
