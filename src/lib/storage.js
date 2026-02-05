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

export async function deleteFile(bucket, path) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])
  if (error) throw error
}
