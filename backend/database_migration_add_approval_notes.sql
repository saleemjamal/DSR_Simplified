-- Migration: Add approval_notes column to sales table
-- Date: 2025-07-20
-- Purpose: Fix sales approval functionality by adding missing approval_notes column

-- Add approval_notes column to sales table to match expenses table structure
ALTER TABLE sales ADD COLUMN approval_notes TEXT;

-- Verify the column was added
\d sales;