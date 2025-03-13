import { createClient } from "@supabase/supabase-js"
import * as Sentry from "@sentry/nextjs"
import type { FileItem, FileUploadResponse } from "@/lib/types/documents"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const BUCKET_NAME = "esg-documents"

export async function uploadFile(
  file: File,
  path: string,
  onProgress?: (progress: number) => void,
): Promise<FileUploadResponse> {
  try {
    const filePath = `${path}/${file.name}`

    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    })

    if (error) throw error

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path)

    return {
      path: data.path,
      url: urlData.publicUrl,
    }
  } catch (error) {
    Sentry.captureException(error)
    throw error
  }
}

export async function deleteFile(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])

    if (error) throw error
  } catch (error) {
    Sentry.captureException(error)
    throw error
  }
}

export async function createFolder(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(`${path}/.keep`, new Blob([]))

    if (error) throw error
  } catch (error) {
    Sentry.captureException(error)
    throw error
  }
}

export async function listFiles(path: string): Promise<FileItem[]> {
  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(path)

    if (error) throw error

    return data.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.metadata?.mimetype ? "file" : "folder",
      size: item.metadata?.size,
      modified: new Date(item.created_at),
      path: path.split("/").filter(Boolean),
      url: item.metadata?.mimetype
        ? supabase.storage.from(BUCKET_NAME).getPublicUrl(item.name).data.publicUrl
        : undefined,
      metadata: item.metadata,
    }))
  } catch (error) {
    Sentry.captureException(error)
    throw error
  }
}

