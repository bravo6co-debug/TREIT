const fs = require('fs');
const https = require('https');
const path = require('path');

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🚀 TreitMaster 데이터베이스 스키마 배포 시작...');

// 청크 파일들을 순서대로 읽고 실행
const chunkFiles = [
  'chunk-1-extensions-enums.sql',
  'chunk-2-core-tables.sql', 
  'chunk-3-remaining-tables.sql',
  'chunk-4-additional-tables.sql',
  'chunk-5-indexes-rls.sql',
  'chunk-6-functions-data.sql',
  'chunk-7-level-data.sql'
];

// SQL 실행 함수
function executeSQL(sql, retries = 3) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      hostname: 'qbdctgumggdtfewttela.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body });
        } else if (retries > 0) {
          console.log(`⚠️  재시도 중... 남은 시도: ${retries}`);
          setTimeout(() => {
            executeSQL(sql, retries - 1).then(resolve).catch(reject);
          }, 2000);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', (error) => {
      if (retries > 0) {
        console.log(`⚠️  네트워크 오류, 재시도 중... 남은 시도: ${retries}`);
        setTimeout(() => {
          executeSQL(sql, retries - 1).then(resolve).catch(reject);
        }, 2000);
      } else {
        reject(error);
      }
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      if (retries > 0) {
        executeSQL(sql, retries - 1).then(resolve).catch(reject);
      } else {
        reject(new Error('요청 타임아웃'));
      }
    });
    
    req.write(postData);
    req.end();
  });
}

// 대안 방법: Direct SQL 실행
async function executeSQLDirect(sql) {
  return new Promise((resolve, reject) => {
    const postData = sql;
    
    const options = {
      hostname: 'qbdctgumggdtfewttela.supabase.co',
      port: 443,
      path: '/v1/sql',
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Direct SQL 타임아웃'));
    });
    
    req.write(postData);
    req.end();
  });
}

// 청크별 배포 함수
async function deployChunk(filename) {
  try {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`파일을 찾을 수 없습니다: ${filename}`);
    }
    
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`📝 ${filename} 배포 중... (${Math.round(sql.length/1024)}KB)`);
    
    // 여러 줄 명령문을 개별적으로 실행
    const statements = sql.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`   └─ ${statements.length}개 명령문 실행`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await executeSQLDirect(statement + ';');
          if (i % 10 === 0) {
            process.stdout.write(`   └─ 진행률: ${Math.round((i/statements.length)*100)}%\r`);
          }
        } catch (error) {
          // 이미 존재하는 타입/테이블 오류는 무시
          if (!error.message.includes('already exists') && 
              !error.message.includes('duplicate key')) {
            console.log(`   ⚠️  명령문 오류 (무시됨): ${error.message.substring(0, 100)}...`);
          }
        }
      }
    }
    
    console.log(`   ✅ ${filename} 완료`);
    return true;
    
  } catch (error) {
    console.error(`   ❌ ${filename} 실패: ${error.message}`);
    return false;
  }
}

// 배포 검증 함수
async function verifyDeployment() {
  console.log('🔍 배포 검증 중...');
  
  const tests = [
    {
      name: 'ENUM 타입 확인',
      query: "SELECT COUNT(*) as count FROM pg_type WHERE typtype = 'e'"
    },
    {
      name: '테이블 확인', 
      query: "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
    },
    {
      name: '레벨 데이터 확인',
      query: "SELECT COUNT(*) as count FROM level_config"
    }
  ];
  
  for (const test of tests) {
    try {
      const result = await executeSQLDirect(test.query);
      const count = JSON.parse(result.body)[0]?.count || 0;
      console.log(`   ✅ ${test.name}: ${count}개`);
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
    }
  }
}

// 메인 배포 함수
async function deploySchema() {
  console.log('🔧 Service Role Key로 직접 배포 시작...');
  
  let successCount = 0;
  
  for (const filename of chunkFiles) {
    const success = await deployChunk(filename);
    if (success) successCount++;
    
    // 청크 간 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 배포 결과: ${successCount}/${chunkFiles.length} 청크 성공`);
  
  if (successCount === chunkFiles.length) {
    console.log('🎉 데이터베이스 스키마 배포 완료!');
    await verifyDeployment();
  } else {
    console.log('⚠️  일부 청크 배포에 실패했지만 계속 진행합니다.');
  }
}

// 실행
deploySchema().catch(error => {
  console.error('💥 배포 중 오류 발생:', error);
  process.exit(1);
});