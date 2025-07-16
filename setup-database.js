const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL bağlantısı
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  try {
    console.log('🔧 Veritabanı kurulumu başlatılıyor...');
    
    // SQL migration dosyasını oku
    const migrationPath = path.join(__dirname, 'migrations', 'create-quiz-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Migration'ı çalıştır
    console.log('📋 Quiz tabloları oluşturuluyor...');
    await pool.query(migrationSQL);
    console.log('✅ Quiz tabloları başarıyla oluşturuldu');
    
    // Varsayılan quiz sorularını ekle
    console.log('📝 Varsayılan quiz soruları ekleniyor...');
    const { seedDefaultQuestions } = require('./models/Quiz');
    await seedDefaultQuestions();
    console.log('✅ Varsayılan sorular başarıyla eklendi');
    
    console.log('🎉 Veritabanı kurulumu tamamlandı!');
    
  } catch (error) {
    console.error('❌ Veritabanı kurulum hatası:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Script doğrudan çalıştırılırsa
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('🚀 Kurulum başarıyla tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Kurulum başarısız:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase }; 