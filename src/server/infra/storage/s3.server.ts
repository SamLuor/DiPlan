import { randomUUID } from 'node:crypto'
import { DeleteObjectCommand, PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '~/server/infra/config/env.server'

const UPLOAD_URL_TTL_SECONDS = 5 * 60
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60

/**
 * Sem credenciais explícitas: usa a chain padrão do AWS SDK — na EC2, pega automaticamente
 * da IAM role anexada à instância (instance profile); localmente, do `aws configure`/env vars
 * de quem estiver rodando, se configurado.
 */
const s3 = new S3Client({ region: env.AWS_REGION })

/**
 * Chave do objeto sempre gerada aqui (uuid), nunca a partir do nome enviado pelo usuário —
 * evita path traversal e colisão entre anexos de entregas diferentes.
 */
export function buildAnexoKey(entregaId: string) {
  return `entregas/${entregaId}/${randomUUID()}`
}

export async function createUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key, ContentType: contentType })
  return getSignedUrl(s3, command, { expiresIn: UPLOAD_URL_TTL_SECONDS })
}

export async function createDownloadUrl(key: string, nome: string) {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${nome.replace(/"/g, '')}"`,
  })
  return getSignedUrl(s3, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS })
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }))
}
