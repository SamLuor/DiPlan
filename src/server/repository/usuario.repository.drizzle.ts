import { eq } from 'drizzle-orm'
import { db } from '~/server/infra/db/client'
import { usuarios } from '~/server/infra/db/schema'
import type { Usuario, UsuarioRepository } from './usuario.repository'

const PUBLIC_COLUMNS = {
  id: usuarios.id,
  nome: usuarios.nome,
  email: usuarios.email,
  modo: usuarios.modo,
  perfil: usuarios.perfil,
  eixoId: usuarios.eixoId,
}

export const usuarioRepository: UsuarioRepository = {
  async findAll() {
    return db.select(PUBLIC_COLUMNS).from(usuarios).orderBy(usuarios.nome)
  },

  async findById(id) {
    const [row] = await db.select(PUBLIC_COLUMNS).from(usuarios).where(eq(usuarios.id, id)).limit(1)
    return row ?? null
  },

  async findByEixo(eixoId) {
    return db.select(PUBLIC_COLUMNS).from(usuarios).where(eq(usuarios.eixoId, eixoId)).orderBy(usuarios.nome)
  },

  async findByEmailForAuth(email) {
    const [row] = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1)
    return row ?? null
  },

  async findByIdForAuth(id) {
    const [row] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1)
    return row ?? null
  },

  async create(data) {
    const [row] = await db
      .insert(usuarios)
      .values({ nome: data.nome, email: data.email, modo: data.modo, senhaHash: data.senhaHash, perfil: data.perfil, eixoId: data.eixoId })
      .returning(PUBLIC_COLUMNS)
    return row as Usuario
  },

  async update(id, data) {
    const [row] = await db
      .update(usuarios)
      .set({ nome: data.nome, email: data.email, modo: data.modo, senhaHash: data.senhaHash, perfil: data.perfil, eixoId: data.eixoId, updatedAt: new Date() })
      .where(eq(usuarios.id, id))
      .returning(PUBLIC_COLUMNS)
    return row ?? null
  },

  async updatePerfil(id, perfil) {
    const [row] = await db.update(usuarios).set({ perfil, updatedAt: new Date() }).where(eq(usuarios.id, id)).returning(PUBLIC_COLUMNS)
    return row ?? null
  },
}
