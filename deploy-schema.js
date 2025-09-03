const fs = require('fs');
const https = require('https');

// Read the schema file
const schema = fs.readFileSync('C:\\dev-project\\TreitMaster\\database-schema-complete.sql', 'utf8');

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Split schema into individual statements
const statements = schema.split(';').filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--'));

console.log(`Found ${statements.length} SQL statements to execute`);

// Function to execute SQL via REST API
function executeSQL(sql, callback) {
    const data = JSON.stringify({ query: sql });
    
    const options = {
        hostname: new URL(SUPABASE_URL).hostname,
        port: 443,
        path: '/rest/v1/rpc/execute_sql',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    };
    
    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            try {
                const result = JSON.parse(body);
                callback(null, result);
            } catch (e) {
                callback(new Error(`Parse error: ${body}`), null);
            }
        });
    });
    
    req.on('error', callback);
    req.write(data);
    req.end();
}

// Execute statements one by one
async function deploySchema() {
    for (let i = 0; i < Math.min(5, statements.length); i++) {
        const stmt = statements[i].trim();
        if (stmt) {
            console.log(`Executing statement ${i + 1}: ${stmt.substring(0, 50)}...`);
            
            try {
                await new Promise((resolve, reject) => {
                    executeSQL(stmt, (error, result) => {
                        if (error) {
                            console.error(`Error executing statement ${i + 1}:`, error.message);
                            reject(error);
                        } else {
                            console.log(`Statement ${i + 1} executed successfully`);
                            console.log('Result:', result);
                            resolve(result);
                        }
                    });
                });
            } catch (error) {
                console.error(`Failed to execute statement ${i + 1}:`, error.message);
                break;
            }
        }
    }
}

// Test with a simple query first
console.log('Testing connection with simple query...');
executeSQL('SELECT 1 as test', (error, result) => {
    if (error) {
        console.error('Connection test failed:', error.message);
    } else {
        console.log('Connection test successful:', result);
        deploySchema();
    }
});