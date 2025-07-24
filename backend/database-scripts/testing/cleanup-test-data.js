#!/usr/bin/env node

/**
 * Cleanup Test Data Script
 * 
 * This script removes all test data from the database
 * Test data is identified by store names containing "test" (case-insensitive)
 * 
 * Usage: node scripts/cleanup-test-data.js
 */

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('../node_modules/dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
}
const { supabaseAdmin } = require('../src/config/supabase')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query) => new Promise((resolve) => rl.question(query, resolve))

async function getTestData() {
  console.log('\n🔍 Searching for test data...\n')

  // Get test stores
  const { data: stores, error: storesError } = await supabaseAdmin
    .from('stores')
    .select('*')
    .ilike('store_name', '%test%')
    .order('store_name')

  if (storesError) throw storesError

  if (!stores || stores.length === 0) {
    console.log('✅ No test stores found!')
    return null
  }

  const storeIds = stores.map(s => s.id)

  // Get related data counts
  const [sales, expenses, users, vouchers, damage, handBills] = await Promise.all([
    supabaseAdmin.from('sales').select('id', { count: 'exact' }).in('store_id', storeIds),
    supabaseAdmin.from('expenses').select('id', { count: 'exact' }).in('store_id', storeIds),
    supabaseAdmin.from('users').select('id', { count: 'exact' }).in('store_id', storeIds),
    supabaseAdmin.from('vouchers').select('id', { count: 'exact' }).in('store_id', storeIds),
    supabaseAdmin.from('damage').select('id', { count: 'exact' }).in('store_id', storeIds),
    supabaseAdmin.from('hand_bills').select('id', { count: 'exact' }).in('store_id', storeIds)
  ])

  return {
    stores,
    storeIds,
    counts: {
      stores: stores.length,
      sales: sales.count || 0,
      expenses: expenses.count || 0,
      users: users.count || 0,
      vouchers: vouchers.count || 0,
      damage: damage.count || 0,
      handBills: handBills.count || 0
    }
  }
}

async function displayPreview(testData) {
  console.log('='.repeat(50))
  console.log('📊 TEST DATA SUMMARY')
  console.log('='.repeat(50))
  
  console.log('\n📍 Test Stores:')
  testData.stores.forEach(store => {
    console.log(`   - ${store.store_name} (ID: ${store.id})`)
  })

  console.log('\n📈 Related Records to be Deleted:')
  console.log(`   - Sales Records: ${testData.counts.sales}`)
  console.log(`   - Expense Records: ${testData.counts.expenses}`)
  console.log(`   - User Accounts: ${testData.counts.users}`)
  console.log(`   - Gift Vouchers: ${testData.counts.vouchers}`)
  console.log(`   - Damage Reports: ${testData.counts.damage}`)
  console.log(`   - Hand Bills: ${testData.counts.handBills}`)
  
  const totalRecords = Object.values(testData.counts).reduce((a, b) => a + b, 0)
  console.log(`\n   📝 Total Records: ${totalRecords}`)
  console.log('='.repeat(50))
}

async function deleteTestData(storeIds) {
  console.log('\n🗑️  Starting deletion process...\n')

  const tables = [
    { name: 'sales', column: 'store_id' },
    { name: 'expenses', column: 'store_id' },
    { name: 'vouchers', column: 'store_id' },
    { name: 'damage', column: 'store_id' },
    { name: 'hand_bills', column: 'store_id' },
    { name: 'users', column: 'store_id' },
    { name: 'stores', column: 'id' }
  ]

  for (const table of tables) {
    process.stdout.write(`   Deleting from ${table.name}...`)
    
    const { error } = await supabaseAdmin
      .from(table.name)
      .delete()
      .in(table.column, storeIds)

    if (error) {
      console.log(' ❌ Failed!')
      throw error
    }
    
    console.log(' ✅ Done!')
  }

  console.log('\n✨ All test data has been deleted successfully!')
}

async function main() {
  try {
    console.log('\n🧹 TEST DATA CLEANUP UTILITY')
    console.log('============================')

    // Get test data
    const testData = await getTestData()

    if (!testData) {
      rl.close()
      return
    }

    // Display preview
    displayPreview(testData)

    // Confirm deletion
    console.log('\n⚠️  WARNING: This action cannot be undone!')
    const answer = await question('\nProceed with deletion? (yes/no): ')

    if (answer.toLowerCase() === 'yes') {
      await deleteTestData(testData.storeIds)
    } else {
      console.log('\n❌ Deletion cancelled.')
    }

    rl.close()
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    rl.close()
    process.exit(1)
  }
}

// Run the script
main()