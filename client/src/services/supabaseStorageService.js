import { supabase, STORAGE_BUCKETS, UPLOAD_CONFIG } from '../config/supabase'

class SupabaseStorageService {
  // Upload certificate file
  async uploadCertificate(file, userId, classId = null) {
    try {
      // Validate file
      this.validateFile(file)

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `certificate_${userId}_${timestamp}.${fileExtension}`
      const filePath = `${userId}/${fileName}`

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.CERTIFICATES)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.CERTIFICATES)
        .getPublicUrl(filePath)

      return {
        success: true,
        filePath,
        publicUrl: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    } catch (error) {
      console.error('Certificate upload error:', error)
      throw error
    }
  }

  // Upload user file (for user profile uploads)
  async uploadUserFile(file, userId, folder = 'general') {
    try {
      // Validate file
      this.validateFile(file)

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `${folder}_${userId}_${timestamp}.${fileExtension}`
      const filePath = `${userId}/${folder}/${fileName}`

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.USER_UPLOADS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.USER_UPLOADS)
        .getPublicUrl(filePath)

      return {
        success: true,
        filePath,
        publicUrl: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    } catch (error) {
      console.error('User file upload error:', error)
      throw error
    }
  }

  // Delete file
  async deleteFile(filePath, bucket = STORAGE_BUCKETS.CERTIFICATES) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath])

      if (error) {
        throw new Error(`Delete failed: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('File deletion error:', error)
      throw error
    }
  }

  // Upload notification attachment
  async uploadNotificationAttachment(file, senderId) {
    try {
      // Validate file
      this.validateFile(file)

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `notification_${senderId}_${timestamp}.${fileExtension}`
      const filePath = `${senderId}/${fileName}`

      // Upload to Supabase storage (use USER_UPLOADS bucket for notifications)
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.USER_UPLOADS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.USER_UPLOADS)
        .getPublicUrl(filePath)

      return {
        success: true,
        filePath,
        publicUrl: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    } catch (error) {
      console.error('Notification attachment upload error:', error)
      throw error
    }
  }

  // Get file URL
  getFileUrl(filePath, bucket = STORAGE_BUCKETS.CERTIFICATES) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  // List files for a user
  async listUserFiles(userId, bucket = STORAGE_BUCKETS.CERTIFICATES) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(userId)

      if (error) {
        throw new Error(`List failed: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('List files error:', error)
      throw error
    }
  }

  // Validate file
  validateFile(file) {
    // Check file size
    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      throw new Error(`File size too large. Maximum size is ${UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`)
    }

    // Check file type
    if (!UPLOAD_CONFIG.ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Only PDF and images (JPEG, PNG) are allowed.')
    }

    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    if (!UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(fileExtension)) {
      throw new Error('Invalid file extension. Only .pdf, .jpg, .jpeg, .png are allowed.')
    }
  }
}

export const supabaseStorageService = new SupabaseStorageService()
export default supabaseStorageService 