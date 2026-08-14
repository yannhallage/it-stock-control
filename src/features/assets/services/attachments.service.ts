import { ENDPOINTS } from '@core/http/endpoints'
import { del, get, post } from '@core/http/http'
import type { Attachment, AttachmentType } from '@core/models'

export type ListAttachmentsParams = {
  assetId?: number
}

export type CreateAttachmentPayload = {
  assetId: number
  type: AttachmentType
  fileName: string
  filePath: string
}

export function listAttachmentsService(params: ListAttachmentsParams = {}): Promise<Attachment[]> {
  const searchParams = new URLSearchParams()
  if (params.assetId != null) searchParams.set('assetId', String(params.assetId))
  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.attachments.base}?${query}` : ENDPOINTS.attachments.base
  return get<Attachment[]>(path)
}

export function createAttachmentService(payload: CreateAttachmentPayload): Promise<Attachment> {
  return post<CreateAttachmentPayload, Attachment>(ENDPOINTS.attachments.base, payload)
}

export function deleteAttachmentService(id: number): Promise<void> {
  return del<void>(`${ENDPOINTS.attachments.base}/${id}`)
}
