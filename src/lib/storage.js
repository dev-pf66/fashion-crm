import { supabase } from './supabase'

export async function uploadFile(bucket, folder, file) {
  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
  const filePath = `${folder}/${fileName}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file)

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

export async function uploadStyleImage(styleId, file) {
  return uploadFile('style-images', `styles/${styleId}`, file)
}

export async function uploadSamplePhoto(sampleId, file) {
  return uploadFile('sample-photos', `samples/${sampleId}`, file)
}

export async function uploadTechPack(styleId, file) {
  return uploadFile('tech-packs', `styles/${styleId}`, file)
}

export async function uploadSupplierDoc(supplierId, file) {
  return uploadFile('supplier-docs', `suppliers/${supplierId}`, file)
}

export async function uploadMaterialSwatch(materialId, file) {
  return uploadFile('style-images', `materials/${materialId}`, file)
}

// task-media bucket is private — we upload and return a short-lived signed URL
// for immediate display. The stored value is always the path, not the URL.
export async function uploadTaskAttachment(taskId, file) {
  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
  const filePath = `tasks/${taskId}/${fileName}`

  const { error } = await supabase.storage.from('task-media').upload(filePath, file)
  if (error) throw error

  const { data: signed } = await supabase.storage
    .from('task-media')
    .createSignedUrl(filePath, 3600)

  return { url: signed?.signedUrl || '', path: filePath }
}

// Generate fresh signed URLs for a list of paths (single round-trip)
export async function signTaskAttachmentUrls(paths) {
  if (!paths.length) return {}
  const { data, error } = await supabase.storage
    .from('task-media')
    .createSignedUrls(paths, 3600)
  if (error) throw error
  const map = {}
  ;(data || []).forEach(s => { map[s.path] = s.signedUrl })
  return map
}

export async function uploadRangeStyleFile(rangeId, styleId, file) {
  return uploadFile('style-files', `${rangeId}/${styleId}`, file)
}

export async function deleteFile(bucket, path) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])
  if (error) throw error
}
