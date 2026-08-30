export type UserModo = 'senha' | 'convite'
export type Perfil = 'diretoria' | 'chefia' | 'operacional'

export interface Usuario {
  id: string
  nome: string
  email: string
  modo: UserModo
  perfil: Perfil
  /** Nulo só pra Diretoria (não pertence a um eixo específico). */
  eixoId: string | null
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
  perfil: Perfil
  /** Nulo só pra Diretoria (não pertence a um eixo específico). */
  eixoId: string | null
}

export interface UsuarioRepository {
  findAll(): Promise<Usuario[]>
  findById(id: string): Promise<Usuario | null>
  findByEixo(eixoId: string): Promise<Usuario[]>
  findByEmailForAuth(email: string): Promise<UsuarioComSenha | null>
  findByIdForAuth(id: string): Promise<UsuarioComSenha | null>
  create(data: NovoUsuarioInput): Promise<Usuario>
  update(id: string, data: NovoUsuarioInput): Promise<Usuario | null>
  updatePerfil(id: string, perfil: Perfil): Promise<Usuario | null>
}
