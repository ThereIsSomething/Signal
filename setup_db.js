require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function setup() {
  const client = new Client({
    connectionString: process.env.DATABASE_POOLED_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to DB");

    // 1. Create storage bucket for documents if not exists
    await client.query(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('documents', 'documents', true)
      ON CONFLICT (id) DO UPDATE SET public = true;
    `);
    console.log("Storage bucket 'documents' ensured.");

    // 2. Allow public access to the bucket (policies)
    await client.query(`
      DROP POLICY IF EXISTS "Public Access" ON storage.objects;
      CREATE POLICY "Public Access"
      ON storage.objects FOR ALL
      USING (bucket_id = 'documents');
    `);
    console.log("Storage bucket policy ensured.");

    // 3. Enable Realtime for the documents table
    await client.query(`
      ALTER TABLE public.documents REPLICA IDENTITY FULL;
      
      -- Ensure publication exists
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
              CREATE PUBLICATION supabase_realtime;
          END IF;
      END
      $$;

      -- Add table to publication if not already there
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_publication_tables 
              WHERE pubname = 'supabase_realtime' AND tablename = 'documents'
          ) THEN
              ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
          END IF;
      END
      $$;
    `);
    console.log("Realtime enabled for 'documents' table.");

  } catch (err) {
    console.error("Error setting up DB:", err);
  } finally {
    await client.end();
  }
}

setup();
