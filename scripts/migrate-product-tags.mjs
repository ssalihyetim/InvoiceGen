#!/usr/bin/env node

/**
 * AI-Powered Product Tagging Migration Script
 *
 * This script analyzes existing products and extracts structured fields:
 * - brand (e.g., "NTG", "VESBO", "IKSAN")
 * - product_subtype (e.g., "EF", "PE", "Coupler")
 * - size_measurement (e.g., "63-50", "110")
 * - material (e.g., "PE", "HDPE", "U-PVC")
 * - pressure_class (e.g., "PN10", "PN16")
 * - product_features (e.g., "Siyah", "Flanşlı")
 *
 * Usage:
 *   node scripts/migrate-product-tags.mjs [--dry-run] [--batch-size=50]
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env.local') })

// Configuration
const BATCH_SIZE = parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '50')
const DRY_RUN = process.argv.includes('--dry-run')

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Known values for validation
const KNOWN_BRANDS = ['NTG', 'VESBO', 'IKSAN', 'WAVIN', 'PIMTAS', 'DIZAYN', 'KALDE']
const KNOWN_MATERIALS = ['PE', 'HDPE', 'U-PVC', 'UH-PVC', 'PP', 'PVC']
const KNOWN_PRESSURE_CLASSES = ['PN10', 'PN16', 'PN6', 'PN8', 'PN20']
const KNOWN_SUBTYPES = ['EF', 'PE', 'Redüksiyon', 'Coupler', 'Manşon', 'Dirsek', 'T', 'Vana', 'Flanş', 'Tapon']

/**
 * Extract structured fields from product using AI
 */
async function extractStructuredFields(product) {
  const prompt = `Analyze this product and extract structured fields in JSON format.

Product Information:
- Type: ${product.product_type || 'N/A'}
- Diameter: ${product.diameter || 'N/A'}
- Code: ${product.product_code || 'N/A'}
- Description: ${product.description || 'N/A'}

Extract these fields (return null if not found):
{
  "brand": "Manufacturer brand (e.g., NTG, VESBO, IKSAN)",
  "product_subtype": "Specific product variant (e.g., EF, PE, Redüksiyon, Coupler)",
  "size_measurement": "Numeric measurements only (e.g., 63-50, 110, 20-25)",
  "material": "Raw material (e.g., PE, HDPE, U-PVC, UH-PVC)",
  "pressure_class": "Pressure rating (e.g., PN10, PN16)",
  "product_features": "Additional features (e.g., Siyah, Flanşlı, Kaynaklı)"
}

Known brands: ${KNOWN_BRANDS.join(', ')}
Known materials: ${KNOWN_MATERIALS.join(', ')}
Known pressure classes: ${KNOWN_PRESSURE_CLASSES.join(', ')}
Known subtypes: ${KNOWN_SUBTYPES.join(', ')}

Return ONLY valid JSON, no explanation. Use null for missing values.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a product data extraction expert. Extract structured product information and return only valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 300
    })

    const content = response.choices[0].message.content.trim()

    // Extract JSON from response (handle code blocks)
    let jsonStr = content
    if (content.includes('```')) {
      jsonStr = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)?.[1] || content
    }

    const extracted = JSON.parse(jsonStr)

    // Validate and normalize
    return {
      brand: validateBrand(extracted.brand),
      product_subtype: validateSubtype(extracted.product_subtype),
      size_measurement: validateSize(extracted.size_measurement),
      material: validateMaterial(extracted.material),
      pressure_class: validatePressureClass(extracted.pressure_class) || 'PN10', // Default to PN10
      product_features: extracted.product_features?.trim() || null
    }
  } catch (error) {
    console.error(`  ❌ AI extraction failed for product ${product.id}:`, error.message)
    return fallbackExtraction(product)
  }
}

/**
 * Fallback extraction using regex patterns (no AI)
 */
function fallbackExtraction(product) {
  const text = `${product.product_type || ''} ${product.diameter || ''} ${product.product_code || ''} ${product.description || ''}`.toUpperCase()

  return {
    brand: extractBrand(text),
    product_subtype: extractSubtype(text),
    size_measurement: extractSize(text),
    material: extractMaterial(text),
    pressure_class: extractPressureClass(text) || 'PN10',
    product_features: null
  }
}

// Validation helpers
function validateBrand(value) {
  if (!value) return null
  const upper = value.toUpperCase().trim()
  return KNOWN_BRANDS.find(b => upper.includes(b)) || null
}

function validateMaterial(value) {
  if (!value) return null
  const upper = value.toUpperCase().trim()
  // Prefer exact matches
  const exact = KNOWN_MATERIALS.find(m => upper === m)
  if (exact) return exact
  // Then partial matches
  return KNOWN_MATERIALS.find(m => upper.includes(m)) || null
}

function validatePressureClass(value) {
  if (!value) return null
  const upper = value.toUpperCase().trim()
  return KNOWN_PRESSURE_CLASSES.find(p => upper.includes(p)) || null
}

function validateSubtype(value) {
  if (!value) return null
  const normalized = value.trim()
  // Check if it's a known subtype or looks reasonable
  if (KNOWN_SUBTYPES.some(st => normalized.toUpperCase().includes(st.toUpperCase()))) {
    return normalized
  }
  return normalized.length > 1 && normalized.length < 50 ? normalized : null
}

function validateSize(value) {
  if (!value) return null
  const normalized = value.trim()
  // Match patterns like "63-50", "110", "20x25"
  const sizePattern = /(\d{2,3}[-xX]\d{2,3}|\d{2,3})/
  const match = normalized.match(sizePattern)
  return match ? match[0].replace(/x/gi, '-') : null
}

// Regex extractors
function extractBrand(text) {
  for (const brand of KNOWN_BRANDS) {
    if (text.includes(brand)) return brand
  }
  return null
}

function extractMaterial(text) {
  // Prefer longer matches first (UH-PVC before U-PVC)
  const sorted = [...KNOWN_MATERIALS].sort((a, b) => b.length - a.length)
  for (const material of sorted) {
    if (text.includes(material)) return material
  }
  return null
}

function extractPressureClass(text) {
  for (const pc of KNOWN_PRESSURE_CLASSES) {
    if (text.includes(pc)) return pc
  }
  return null
}

function extractSubtype(text) {
  for (const st of KNOWN_SUBTYPES) {
    if (text.includes(st.toUpperCase())) return st
  }
  return null
}

function extractSize(text) {
  const match = text.match(/(\d{2,3}[-xX]\d{2,3}|\d{2,3})/)
  return match ? match[0].replace(/x/gi, '-') : null
}

/**
 * Update product with structured fields
 */
async function updateProduct(product, fields) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would update product ${product.id}:`, fields)
    return { success: true }
  }

  const { error } = await supabase
    .from('products')
    .update(fields)
    .eq('id', product.id)

  if (error) {
    console.error(`  ❌ Failed to update product ${product.id}:`, error.message)
    return { success: false, error }
  }

  return { success: true }
}

/**
 * Main migration function
 */
async function migrateProducts() {
  console.log('\n🚀 Starting Product Tagging Migration')
  console.log(`📊 Batch size: ${BATCH_SIZE}`)
  console.log(`🔍 Dry run: ${DRY_RUN ? 'YES' : 'NO'}\n`)

  // Get total product count
  const { count: totalCount, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('❌ Failed to get product count:', countError.message)
    process.exit(1)
  }

  console.log(`📦 Total products: ${totalCount}\n`)

  let processed = 0
  let updated = 0
  let skipped = 0
  let errors = 0
  let offset = 0

  while (offset < totalCount) {
    // Fetch batch
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) {
      console.error(`❌ Failed to fetch batch at offset ${offset}:`, error.message)
      errors++
      offset += BATCH_SIZE
      continue
    }

    console.log(`\n📦 Processing batch ${Math.floor(offset / BATCH_SIZE) + 1} (${offset + 1}-${offset + products.length})`)

    // Process each product
    for (const product of products) {
      processed++

      // Skip if already has tags (optional - remove if you want to re-tag)
      if (product.brand && product.size_measurement) {
        console.log(`  ⏭️  Skipping ${product.product_code} (already tagged)`)
        skipped++
        continue
      }

      console.log(`  🔄 Processing ${product.product_code}...`)

      // Extract fields using AI
      const fields = await extractStructuredFields(product)

      // Show extracted data
      const summary = Object.entries(fields)
        .filter(([_, v]) => v !== null)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')

      if (summary) {
        console.log(`     ✓ Extracted: ${summary}`)
      } else {
        console.log(`     ⚠️  No fields extracted`)
      }

      // Update product
      const result = await updateProduct(product, fields)

      if (result.success) {
        updated++
      } else {
        errors++
      }

      // Rate limiting (OpenAI free tier: 3 RPM)
      if ((processed % 3) === 0) {
        console.log('  ⏳ Rate limiting... (waiting 60s)')
        await new Promise(resolve => setTimeout(resolve, 60000))
      }
    }

    offset += BATCH_SIZE
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('✅ Migration Complete!')
  console.log('='.repeat(60))
  console.log(`📊 Total processed: ${processed}`)
  console.log(`✅ Updated: ${updated}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Errors: ${errors}`)
  console.log('='.repeat(60))

  // Check data quality
  if (!DRY_RUN) {
    console.log('\n📈 Checking data quality...\n')
    const { data: quality } = await supabase
      .from('v_product_data_quality')
      .select('*')
      .single()

    if (quality) {
      console.log('Data Quality Metrics:')
      console.log(`  Brand fill rate: ${quality.brand_fill_rate}%`)
      console.log(`  Subtype fill rate: ${quality.subtype_fill_rate}%`)
      console.log(`  Size fill rate: ${quality.size_fill_rate}%`)
      console.log(`  Material fill rate: ${quality.material_fill_rate}%`)
      console.log(`  Pressure fill rate: ${quality.pressure_fill_rate}%`)
      console.log(`  Features fill rate: ${quality.features_fill_rate}%`)
    }
  }
}

// Run migration
migrateProducts().catch(error => {
  console.error('\n❌ Migration failed:', error)
  process.exit(1)
})