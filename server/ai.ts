import OpenAI from 'openai'
import { db } from './db'
import { contracts } from './db/schema'
import { eq } from 'drizzle-orm'
import { logger } from './logger'
import type { AnalysisResults } from '@shared/types'

let openai: OpenAI | null = null

function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

const ANALYSIS_PROMPT = `
  Analyze the following contract text and provide a structured JSON output.
  The JSON object should conform to the following structure:
  {
    "summary": "A concise, one-paragraph summary of the contract's purpose and scope.",
    "parties": [
      { "name": "Full legal name of a party", "role": "Their role, e.g., 'Landlord', 'Service Provider'" }
    ],
    "keyDates": {
      "effectiveDate": "YYYY-MM-DD or empty string",
      "terminationDate": "YYYY-MM-DD or empty string",
      "renewalTerms": "Description of renewal terms or empty string"
    },
    "highLevelRisks": [
      "A specific potential risk identified in the contract."
    ]
  }
  Ensure all dates are in YYYY-MM-DD format. If a date is not present, use empty string.
  If no specific risks are identified, provide an empty array.
  Do not include any text or formatting outside of the JSON object itself.
`

/**
 * Analyzes contract text using the OpenAI API and updates the database record.
 * @param contractId The UUID of the contract to analyze.
 * @param textContent The raw text content of the contract.
 */
export async function analyzeContract(
  contractId: string,
  textContent: string,
): Promise<void> {
  logger.info('Starting AI contract analysis', { 
    contractId, 
    textLength: textContent.length 
  })
  try {
    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: textContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })

    const resultJson = response.choices[0].message?.content
    if (!resultJson) {
      throw new Error('OpenAI returned an empty response.')
    }

    const analysisResults: AnalysisResults = JSON.parse(resultJson)

    // Update the contract in the database with the results
    await db
      .update(contracts)
      .set({
        aiInsights: analysisResults,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, contractId))

    logger.info('AI contract analysis completed successfully', { 
      contractId,
      parties: analysisResults.parties?.length || 0,
      risks: analysisResults.highLevelRisks?.length || 0
    })
  } catch (error) {
    logger.error('AI contract analysis failed', { 
      contractId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    // Update the contract to reflect the failed status
    await db
      .update(contracts)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, contractId))
  }
}