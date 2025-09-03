const fs = require('fs');
const https = require('https');
const path = require('path');

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL?.replace('https://', '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🚀 TreitMaster 데이터베이스 스키마 배포 시작 (RPC 방식)...');

// RPC 함수를 통한 SQL 실행
function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    // SQL을 여러 명령문으로 분리
    const statements = sql.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // 각 명령문을 개별적으로 실행
    executeStatements(statements, 0, resolve, reject);
  });
}

function executeStatements(statements, index, resolve, reject) {
  if (index >= statements.length) {
    resolve({ success: true, executed: index });
    return;
  }

  const statement = statements[index];
  if (!statement) {
    executeStatements(statements, index + 1, resolve, reject);
    return;
  }

  const postData = JSON.stringify({
    sql: statement + ';'
  });

  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/rpc/exec_sql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // 성공적으로 실행된 경우 다음 명령문으로
        setTimeout(() => {
          executeStatements(statements, index + 1, resolve, reject);
        }, 100);
      } else {
        // 오류가 있어도 계속 진행 (이미 존재하는 타입 등)
        const error = body.toLowerCase();
        if (error.includes('already exists') || 
            error.includes('duplicate') ||
            error.includes('does not exist')) {
          console.log(`   ⚠️  명령문 ${index + 1} 건너뜀: ${error.substring(0, 50)}...`);
          setTimeout(() => {
            executeStatements(statements, index + 1, resolve, reject);
          }, 100);
        } else {
          console.error(`   ❌ 명령문 ${index + 1} 실패: ${body}`);
          setTimeout(() => {
            executeStatements(statements, index + 1, resolve, reject);
          }, 100);
        }
      }
    });
  });

  req.on('error', (error) => {
    console.error(`   ❌ 네트워크 오류: ${error.message}`);
    // 네트워크 오류가 있어도 계속 진행
    setTimeout(() => {
      executeStatements(statements, index + 1, resolve, reject);
    }, 1000);
  });

  req.setTimeout(30000, () => {
    req.destroy();
    console.log(`   ⚠️  명령문 ${index + 1} 타임아웃`);
    setTimeout(() => {
      executeStatements(statements, index + 1, resolve, reject);
    }, 100);
  });

  req.write(postData);
  req.end();
}

// 완전한 스키마를 한 번에 배포하는 함수
async function deployCompleteSchema() {
  try {
    console.log('📖 완전한 스키마 파일 읽는 중...');
    const schemaPath = path.join(__dirname, 'database-schema-complete.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error('database-schema-complete.sql 파일을 찾을 수 없습니다.');
    }
    
    const sql = fs.readFileSync(schemaPath, 'utf8');
    console.log(`📊 스키마 크기: ${Math.round(sql.length/1024)}KB`);
    
    // 명령문 개수 계산
    const statements = sql.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔧 ${statements.length}개 명령문을 실행합니다...`);
    
    const result = await executeSQL(sql);
    
    console.log(`✅ ${result.executed}개 명령문 처리 완료`);
    return true;
    
  } catch (error) {
    console.error(`💥 스키마 배포 실패: ${error.message}`);
    return false;
  }
}

// 간단한 테스트 쿼리
async function testConnection() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/',
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Supabase 연결 성공');
          resolve(true);
        } else {
          console.log(`⚠️  Supabase 응답: ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ 연결 실패: ${error.message}`);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.log('⚠️  연결 타임아웃');
      resolve(false);
    });

    req.end();
  });
}

// 배포 검증
async function verifyTables() {
  return new Promise((resolve) => {
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/level_config?select=level&limit=1',
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ level_config 테이블 접근 성공');
          console.log(`   데이터 샘플: ${body.substring(0, 100)}...`);
          resolve(true);
        } else {
          console.log(`❌ level_config 테이블 접근 실패: ${res.statusCode}`);
          console.log(`   응답: ${body}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ 검증 오류: ${error.message}`);
      resolve(false);
    });

    req.end();
  });
}

// 메인 실행
async function main() {
  console.log('🔍 연결 테스트 중...');
  const connected = await testConnection();
  
  if (!connected) {
    console.error('💥 Supabase 연결 실패. 배포를 중단합니다.');
    process.exit(1);
  }

  console.log('📦 스키마 배포 시작...');
  const deployed = await deployCompleteSchema();
  
  if (deployed) {
    console.log('🔍 배포 검증 중...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기
    
    const verified = await verifyTables();
    if (verified) {
      console.log('🎉 데이터베이스 스키마 배포 및 검증 완료!');
    } else {
      console.log('⚠️  배포는 완료되었지만 일부 테이블 접근에 문제가 있을 수 있습니다.');
    }
  }
}

main().catch(console.error);