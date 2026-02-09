
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { logger } from '../utils/logger.js'
import crypto from 'crypto'
import { Readable } from 'stream'

// File type magic numbers for validation
const MAGIC_NUMBERS = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  docx: [0x50, 0x4b, 0x03, 0x04], // ZIP signature (DOCX is ZIP-based)
  doc: [0xd0, 0xcf, 0x11, 0xe0], // Microsoft Office signature
  txt: [], // Text files don't have magic numbers
}

class S3StorageService {
  private s3Client: S3Client
  private bucketName: string

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
    this.bucketName = process.env.S3_BUCKET_NAME!
  }

  // Validate file type using magic numbers
  private validateFileType(buffer: Buffer, expectedType: string): boolean {
    const magicNumbers =
      MAGIC_NUMBERS[expectedType as keyof typeof MAGIC_NUMBERS]
    if (!magicNumbers || magicNumbers.length === 0) return true // Skip validation for text files

    return magicNumbers.every((byte, index) => buffer[index] === byte)
  }

  // Generate unique file key
  private generateFileKey(originalName: string, userId: string): string {
    const timestamp = Date.now()
    const random = crypto.randomBytes(8).toString('hex')
    const extension = originalName.split('.').pop()
    return `contracts/${userId}/${timestamp}-${random}.${extension}`
  }

  // Upload file with streaming
  async uploadFile(
    fileStream: Readable,
    originalName: string,
    userId: string,
    contentType: string
  ): Promise<{ key: string; url: string }> {
    try {
      // Read first chunk to validate magic numbers
      const chunks: Buffer[] = []
      let totalSize = 0
      const maxSize = 10 * 1024 * 1024 // 10MB limit

      for await (const chunk of fileStream) {
        chunks.push(chunk)
        totalSize += chunk.length

        if (totalSize > maxSize) {
          throw new Error('File size exceeds 10MB limit')
        }
      }

      const fileBuffer = Buffer.concat(chunks)

      // Validate file type
      const fileExtension = originalName.split('.').pop()?.toLowerCase()
      if (fileExtension && ['pdf', 'doc', 'docx'].includes(fileExtension)) {
        if (!this.validateFileType(fileBuffer, fileExtension)) {
          throw new Error(`Invalid file format for .${fileExtension} file`)
        }
      }

      const key = this.generateFileKey(originalName, userId)

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          originalName,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      })

      await this.s3Client.send(command)

      const url = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`

      logger.info('File uploaded to S3', {
        key,
        originalName,
        userId,
        size: totalSize,
      })

      return { key, url }
    } catch (error) {
      logger.error('S3 upload failed:', error)
      throw error
    }
  }

  // Generate presigned URL for secure access
  async getPresignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const url = await getSignedUrl(this.s3Client, command, { expiresIn })

      logger.info('Presigned URL generated', { key, expiresIn })
      return url
    } catch (error) {
      logger.error('Failed to generate presigned URL:', error)
      throw error
    }
  }

  // Delete file
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      await this.s3Client.send(command)

      logger.info('File deleted from S3', { key })
    } catch (error) {
      logger.error('S3 delete failed:', error)
      throw error
    }
  }

  // Get file stream
  async getFileStream(key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const response = await this.s3Client.send(command)
      return response.Body as Readable
    } catch (error) {
      logger.error('Failed to get file stream:', error)
      throw error
    }
  }
}

export const s3Storage = new S3StorageService()

// Export helper functions for backward compatibility
export async function uploadFileToStorage(
  buffer: Buffer,
  originalName: string,
  userId: string
): Promise<string> {
  const stream = Readable.from(buffer)
  const contentType = 'application/octet-stream'
  const result = await s3Storage.uploadFile(
    stream,
    originalName,
    userId,
    contentType
  )
  return result.key
}

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  // Simple text extraction - for PDF use pdf-parse library
  if (mimeType === 'text/plain') {
    return buffer.toString('utf-8')
  }
  // For other types, return placeholder
  return 'Text extraction not implemented for this file type'

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { magicNumbers } from '../utils/magicNumbers';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;

export async function uploadFileToStorage(buffer: Buffer, originalFilename: string, organizationId: string) {
  const mimeType = magicNumbers(buffer) || 'application/octet-stream';
  if (!['application/pdf', 'text/plain'].includes(mimeType)) {
    throw new Error('Unsupported file type');
  }

  const ext = mimeType === 'application/pdf' ? 'pdf' : 'txt';
  const storageKey = `contracts/\( {organizationId}/ \){crypto.randomUUID()}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    Body: buffer,
    ContentType: mimeType,
    Metadata: { organizationId, originalFilename },
    ServerSideEncryption: 'AES256',
  }));

  return { storageKey, mimeType, sizeBytes: buffer.length };
}

export async function getSignedDownloadUrl(storageKey: string) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: storageKey });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

export async function deleteFileFromStorage(storageKey: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }));
        93bd3b4 (Add real AWS S3 storage + Winston logger)
}
