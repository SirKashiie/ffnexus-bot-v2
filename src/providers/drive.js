import 'dotenv/config'
import { google } from 'googleapis'
import { Buffer } from 'node:buffer'

const FOLDER_ID = process.env.GDRIVE_FOLDER_ID || ''
const ALLOWED_MIMES = (process.env.GDRIVE_ALLOWED_MIMES || '').split(',').map(s => s.trim()).filter(Boolean)

const SA_CLIENT_EMAIL = process.env.GDRIVE_CLIENT_EMAIL || ''
const SA_PRIVATE_KEY = (process.env.GDRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n')

let drive

function getAuth() {
  if (!SA_CLIENT_EMAIL || !SA_PRIVATE_KEY) throw new Error('Missing GDRIVE_CLIENT_EMAIL or GDRIVE_PRIVATE_KEY')
  return new google.auth.JWT(SA_CLIENT_EMAIL, null, SA_PRIVATE_KEY, ['https://www.googleapis.com/auth/drive.readonly'])
}
function getDrive() { if (!drive) drive = google.drive({ version: 'v3', auth: getAuth() }); return drive }

function applyMimeFilter(qParts) {
  if (ALLOWED_MIMES.length) qParts.push(`(${ALLOWED_MIMES.map(t => `mimeType='${t}'`).join(' or ')})`)
}
function baseListParams(extra = {}) {
  return {
    fields: 'nextPageToken, files(id,name,mimeType,webViewLink,webContentLink,iconLink,modifiedTime,size)',
    orderBy: 'modifiedTime desc',
    pageSize: 50,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    ...extra
  }
}
function mapFile(f) {
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    link: f.webViewLink || (f.id ? `https://drive.google.com/file/d/${f.id}/view` : ''),
    modified: f.modifiedTime || null,
    size: f.size ? Number(f.size) : null,
    icon: f.iconLink || null,
    download: f.webContentLink || (f.id ? `https://drive.google.com/uc?export=download&id=${f.id}` : '')
  }
}

export async function preloadDrive() {
  try {
    const d = getDrive()
    await d.files.list(baseListParams({ q: FOLDER_ID ? `'${FOLDER_ID}' in parents and trashed=false` : 'trashed=false', pageSize: 1 }))
    console.log('[drive] auth=sa ok')
  } catch (e) { console.error('[drive] preload error', e?.message || e) }
}

export async function searchDriveDocs(query, { pageToken = null, pageSize = 50 } = {}) {
  const d = getDrive()
  const parts = ['trashed = false']; if (FOLDER_ID) parts.unshift(`'${FOLDER_ID}' in parents`)
  applyMimeFilter(parts); if (query) parts.push(`name contains '${String(query).replace(/'/g, "\\'")}'`)
  const q = parts.join(' and ')
  const res = await d.files.list(baseListParams({ q, pageToken: pageToken || undefined, pageSize }))
  const files = (res.data.files || []).map(mapFile)
  return { files, nextPageToken: res.data.nextPageToken || null }
}

export async function listAllDriveDocs({ pageToken = null, pageSize = 50 } = {}) {
  const d = getDrive()
  const parts = ['trashed = false']; if (FOLDER_ID) parts.unshift(`'${FOLDER_ID}' in parents`)
  applyMimeFilter(parts)
  const q = parts.join(' and ')
  const res = await d.files.list(baseListParams({ q, pageToken: pageToken || undefined, pageSize }))
  const files = (res.data.files || []).map(mapFile)
  return { files, nextPageToken: res.data.nextPageToken || null }
}

function isGDoc(m) { return m === 'application/vnd.google-apps.document' }
function isGSheet(m) { return m === 'application/vnd.google-apps.spreadsheet' }
function isGSlide(m) { return m === 'application/vnd.google-apps.presentation' }

export async function getFileBufferById(fileId) {
  const d = getDrive()
  const meta = await d.files.get({ fileId, fields: 'id,name,mimeType', supportsAllDrives: true })
  const f = meta.data
  if (isGDoc(f.mimeType)) { const { data } = await d.files.export({ fileId, mimeType: 'text/plain' }, { responseType: 'arraybuffer' }); return Buffer.from(data) }
  if (isGSheet(f.mimeType)) { const { data } = await d.files.export({ fileId, mimeType: 'text/csv' }, { responseType: 'arraybuffer' }); return Buffer.from(data) }
  if (isGSlide(f.mimeType)) { const { data } = await d.files.export({ fileId, mimeType: 'application/pdf' }, { responseType: 'arraybuffer' }); return Buffer.from(data) }
  const { data } = await d.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' })
  return Buffer.from(data)
}
