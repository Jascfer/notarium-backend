const { Pool } = require('pg');

// PostgreSQL bağlantısı
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupFounder() {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('👑 Kurucu rolü atanıyor...');
    }
    
    // ozgurxspeaktr@gmail.com kullanıcısını bul
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE email = $1',
      ['ozgurxspeaktr@gmail.com']
    );
    
    if (result.rows.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        const maskedEmail = 'oz***@gmail.com';
        console.log('❌ %s e-postalı kullanıcı bulunamadı', maskedEmail);
      }
      return;
    }
    
    const user = result.rows[0];
    if (process.env.NODE_ENV !== 'production') {
      const maskedEmail = user.email.replace(/(.{2}).+(@.+)/, '$1***$2');
      console.log(`👤 Kullanıcı bulundu: ${user.first_name} ${user.last_name} (${maskedEmail})`);
      console.log(`📊 Mevcut rol: ${user.role}`);
    }
    
    // Eğer zaten founder ise güncelleme yapma
    if (user.role === 'founder') {
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Kullanıcı zaten founder rolüne sahip');
      }
      return;
    }
    
    // Rolü founder olarak güncelle
    await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      ['founder', user.id]
    );
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🎉 Kurucu rolü başarıyla atandı!');
      const maskedEmail = user.email.replace(/(.{2}).+(@.+)/, '$1***$2');
      console.log(`👑 ${user.first_name} ${user.last_name} artık kurucu (founder) rolüne sahip (${maskedEmail})`);
    }
    
  } catch (error) {
    console.error('❌ Kurucu rolü atama hatası:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Script doğrudan çalıştırılırsa
if (require.main === module) {
  setupFounder()
    .then(() => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🚀 Kurucu rolü atama işlemi tamamlandı!');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Kurucu rolü atama başarısız:', error);
      process.exit(1);
    });
}

module.exports = { setupFounder }; 