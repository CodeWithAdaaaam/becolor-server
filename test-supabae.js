const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.tijlliezxomqozkkvzfm:8puhgsjxnLOEvOYI@aws-1-eu-west-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    console.log('🔄 Testing connection...');
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    const result = await client.query('SELECT version()');
    console.log('PostgreSQL version:', result.rows[0].version);
    client.release();
    await pool.end();
  } catch (err) {
    console.error('❌ Connection failed!');
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
  }
}

test();