import { Router } from 'express'
import multer from 'multer'
import { eq, sql, and } from 'drizzle-orm'
import { db } from '../db'
import { contracts } from '../db/schema'
import { isAuthenticated } from '../auth'
import { analyzeContract } from '../ai'
import { logger, auditLogger } from '../logger'
import { uploadFileToS3, getPresignedDownloadUrl, getPresignedUploadUrl } from '../storage'
import type { Contract } from '@shared/types'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
})

// GET /api/contracts - List contracts with pagination and selective columns
router.get('/', isAuthenticated, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' })
  }
  
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100) // Max 100
    const offset = (page - 1) * limit
    
    // Parse column selection (comma-separated list of columns)
    const fields = req.query.fields as string
    const selectFields: Record<string, boolean> = {}
    
    if (fields) {
      // Always include id for reference
      selectFields.id = true
      fields.split(',').forEach(field => {
        const trimmed = field.trim()
        if (trimmed) {
          selectFields[trimmed] = true
        }
      })
    }
    
    // Parse sort parameters
    const sortBy = (req.query.sortBy as string) || 'createdAt'
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc'
    
    // Parse filter parameters
    const status = req.query.status as string
    const contractType = req.query.contractType as string
    
    // Build where conditions
    const whereConditions = [eq(contracts.userId, req.user.id)]
    
    if (status) {
      whereConditions.push(eq(contracts.status, status))
    }
    
    if (contractType) {
      whereConditions.push(eq(contracts.contractType, contractType))
    }
    
    const whereClause = whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0]
    
    // Execute query with pagination
    const userContracts = await db.query.contracts.findMany({
      where: whereClause,
      orderBy: (contracts, { desc, asc }) => {
        // Map sortBy to actual column
        const sortableColumns = {
          createdAt: contracts.createdAt,
          updatedAt: contracts.updatedAt,
          status: contracts.status,
          contractType: contracts.contractType,
          title: contracts.title,
        } as const
        
        const sortColumn = sortableColumns[sortBy as keyof typeof sortableColumns] ?? contracts.createdAt
        
        return [sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn)]
      },
      limit: limit,
      offset: offset,
      columns: Object.keys(selectFields).length > 0 ? selectFields : undefined,
    })
    
    // Get total count for pagination metadata
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(contracts)
      .where(whereClause)
    
    const total = Number(totalResult[0]?.count || 0)
    const totalPages = Math.ceil(total / limit)
    
    logger.debug('Contracts list retrieved', { 
      userId: req.user.id, 
      count: userContracts.length,
      page,
      limit,
      total,
    })
    
    res.json({
      data: userContracts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    logger.error('Failed to fetch contracts:', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user.id 
    })
    res.status(500).json({ message: 'Failed to retrieve contracts.' })
  }
})

// GET /api/contracts/:id
router.get('/:id', isAuthenticated, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' })
  }
  const { id } = req.params
  try {
    const contract = await db.query.contracts.findFirst({
      where: eq(contracts.id, id),
    })

    if (!contract || contract.userId !== req.user.id) {
      logger.warn('Contract not found or unauthorized access', { 
        contractId: id, 
        userId: req.user.id 
      })
      return res.status(404).json({ message: 'Contract not found.' })
    }

    auditLogger.contractView(req.user.id, id)
    res.json(contract)
  } catch (error) {
    logger.error(`Failed to fetch contract ${id}:`, { 
      error: error instanceof Error ? error.message : 'Unknown error',
      contractId: id,
      userId: req.user.id 
    })
    res.status(500).json({ message: 'Failed to retrieve contract details.' })
  }
})

// POST /api/contracts/upload
router.post(
  '/upload',
  isAuthenticated,
  upload.single('contractFile'),
  async (req, res) => {
    if (!req.file || !req.user) {
      return res.status(400).json({ message: 'Invalid request.' })
    }

    let insertedContract: Contract | undefined

    try {
      // Upload to S3 with validation and text extraction
      const { storageKey, textContent } = await uploadFileToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.user.id
      )

      const [newContract] = await db
        .insert(contracts)
        .values({
          title: req.file.originalname,
          counterparty: 'To be determined',
          contractType: 'General',
          status: 'processing',
          originalText: textContent,
          storageKey, // Store S3 key
          userId: req.user.id,
        })
        .returning()
      insertedContract = newContract

      auditLogger.contractUpload(req.user.id, newContract.id, req.file.originalname)
      logger.info('Contract uploaded successfully', {
        userId: req.user.id,
        contractId: newContract.id,
        filename: req.file.originalname,
        size: req.file.size,
        storageKey,
      })

      res.status(201).json(insertedContract)

      // Trigger AI analysis in the background
      if (newContract.id) {
        analyzeContract(newContract.id, textContent).catch(err => {
          logger.error('Background analysis failed:', { 
            error: err instanceof Error ? err.message : 'Unknown error',
            contractId: newContract.id 
          })
        })
      }
    } catch (error) {
      logger.error('File upload processing failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user.id,
        filename: req.file.originalname 
      })
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.'

      res.status(500).json({ message: `Upload failed: ${errorMessage}` })
    }
  }
)

// GET /api/contracts/:id/download - Get presigned download URL
router.get('/:id/download', isAuthenticated, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' })
  }
  
  const { id } = req.params
  
  try {
    const contract = await db.query.contracts.findFirst({
      where: eq(contracts.id, id),
    })

    if (!contract || contract.userId !== req.user.id) {
      logger.warn('Contract not found or unauthorized download attempt', { 
        contractId: id, 
        userId: req.user.id 
      })
      return res.status(404).json({ message: 'Contract not found.' })
    }

    if (!contract.storageKey) {
      return res.status(400).json({ message: 'Contract file not available in storage.' })
    }

    const downloadUrl = await getPresignedDownloadUrl(contract.storageKey, 3600)
    
    auditLogger.log('CONTRACT_DOWNLOAD_URL', req.user.id, { 
      contractId: id,
      storageKey: contract.storageKey 
    })
    
    res.json({ downloadUrl, expiresIn: 3600 })
  } catch (error) {
    logger.error('Failed to generate download URL', {
      error: error instanceof Error ? error.message : 'Unknown error',
      contractId: id,
      userId: req.user.id
    })
    res.status(500).json({ message: 'Failed to generate download URL.' })
  }
})

// POST /api/contracts/upload-url - Get presigned upload URL (for direct client upload)
router.post('/upload-url', isAuthenticated, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' })
  }
  
  const { filename, mimeType } = req.body
  
  if (!filename || !mimeType) {
    return res.status(400).json({ message: 'Filename and mimeType are required.' })
  }
  
  try {
    const { uploadUrl, storageKey } = await getPresignedUploadUrl(
      filename,
      mimeType,
      req.user.id,
      3600
    )
    
    logger.info('Generated presigned upload URL', {
      userId: req.user.id,
      filename,
      storageKey
    })
    
    res.json({ uploadUrl, storageKey, expiresIn: 3600 })
  } catch (error) {
    logger.error('Failed to generate upload URL', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user.id,
      filename
    })
    res.status(500).json({ message: 'Failed to generate upload URL.' })
  }
})

export default router