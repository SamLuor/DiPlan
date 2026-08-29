import { create } from 'zustand'

export type EixoModalState = { mode: 'create' } | { mode: 'edit'; eixoId: string } | null
export type PlanoModalState = { mode: 'create'; eixoId: string } | { mode: 'edit'; planoId: string } | null
export type UsuarioModalState = { mode: 'create'; eixoId: string | null } | { mode: 'edit'; usuarioId: string } | null
export type EntregaModalState = { planoId: string } | null

interface UiState {
  eixoModal: EixoModalState
  planoModal: PlanoModalState
  usuarioModal: UsuarioModalState
  entregaModal: EntregaModalState
  solicitacaoModalOpen: boolean
  detailEntregaId: string | null

  openEixoModal: (state: EixoModalState) => void
  openPlanoModal: (state: PlanoModalState) => void
  openUsuarioModal: (state: UsuarioModalState) => void
  openEntregaModal: (state: EntregaModalState) => void
  openSolicitacaoModal: () => void
  closeModal: () => void

  openDetail: (entregaId: string) => void
  closeDetail: () => void
}

export const useUiStore = create<UiState>((set) => ({
  eixoModal: null,
  planoModal: null,
  usuarioModal: null,
  entregaModal: null,
  solicitacaoModalOpen: false,
  detailEntregaId: null,

  openEixoModal: (state) => set({ eixoModal: state }),
  openPlanoModal: (state) => set({ planoModal: state }),
  openUsuarioModal: (state) => set({ usuarioModal: state }),
  openEntregaModal: (state) => set({ entregaModal: state }),
  openSolicitacaoModal: () => set({ solicitacaoModalOpen: true }),
  closeModal: () => set({ eixoModal: null, planoModal: null, usuarioModal: null, entregaModal: null, solicitacaoModalOpen: false }),

  openDetail: (entregaId) => set({ detailEntregaId: entregaId }),
  closeDetail: () => set({ detailEntregaId: null }),
}))
