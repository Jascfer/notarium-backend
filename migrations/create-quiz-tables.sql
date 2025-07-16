-- Quiz sistemi için gerekli tablolar

-- Quiz soruları tablosu
CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correct_answer INTEGER NOT NULL,
    explanation TEXT,
    category VARCHAR(100) NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Günlük quiz setleri tablosu
CREATE TABLE IF NOT EXISTS daily_quiz_sets (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    questions JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quiz skorları tablosu
CREATE TABLE IF NOT EXISTS quiz_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    answers JSONB,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Users tablosuna experience kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'experience') THEN
        ALTER TABLE users ADD COLUMN experience INTEGER DEFAULT 0;
    END IF;
END $$;

-- Users tablosuna avatar kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar') THEN
        ALTER TABLE users ADD COLUMN avatar VARCHAR(10);
    END IF;
END $$;

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_quiz_scores_user_date ON quiz_scores(user_id, date);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_date ON quiz_scores(date);
CREATE INDEX IF NOT EXISTS idx_daily_quiz_sets_date ON daily_quiz_sets(date);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_category ON quiz_questions(category);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_difficulty ON quiz_questions(difficulty); 