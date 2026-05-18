-- Migration 003: Add title column to complaints table
ALTER TABLE complaints ADD COLUMN title TEXT;
