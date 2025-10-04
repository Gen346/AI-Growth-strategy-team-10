import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

async function imageToBase64(path) {
  const data = await readFile(path);
  return data.toString('base64');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('❌ Недостатньо аргументів!');
    console.log('\n📖 Використання:');
    console.log('   node generate-videos-from-image.js <шлях_до_фото> <промпт>');
    console.log('\n📝 Приклад:');
    console.log('   node generate-videos-from-image.js ./images/photo.png "Створи красиве відео з анімацією"');
    process.exit(1);
  }

  const imagePath = args[0];
  const prompt = args.slice(1).join(' ');

  if (!existsSync(imagePath)) {
    console.error(`❌ Файл не знайдено: ${imagePath}`);
    process.exit(1);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Встанови змінну оточення GEMINI_API_KEY в .env файлі');
    process.exit(1);
  }

  console.log('\n🎥 === Генератор відео з зображення ===');
  console.log(`📸 Зображення: ${imagePath}`);
  console.log(`💬 Промпт: ${prompt}`);
  console.log('=====================================\n');

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  try {
    const videosDir = 'videos';
    if (!existsSync(videosDir)) {
      await mkdir(videosDir, { recursive: true });
      console.log(`✓ Створено папку: ${videosDir}`);
    }

    console.log('📖 Завантаження зображення...');
    const imageBase64 = await imageToBase64(imagePath);
    
    const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    console.log(`✓ Зображення завантажено (${Math.round(imageBase64.length / 1024)} KB)`);
    console.log('🎬 Генерація відео (це може зайняти кілька хвилин)...\n');

    let operation = await ai.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt: prompt,
      image: {
        imageBytes: imageBase64,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        aspectRatio: '16:9',
        durationSeconds: 8,
        personGeneration: PersonGeneration.ALLOW_ADULT,
      },
    });

    let attempts = 0;
    while (!operation.done) {
      attempts++;
      console.log(`⏳ Обробка... (спроба ${attempts}, очікування 10 сек)`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    console.log('\n✅ Відео згенеровано!');

    const videos = operation.response?.generatedVideos;
    if (!videos || videos.length === 0) {
      console.error('❌ Не отримано жодного відео');
      return;
    }

    console.log(`📹 Кількість відео: ${videos.length}\n`);

    for (let i = 0; i < videos.length; i++) {
      const uri = videos[i]?.video?.uri;
      if (!uri) {
        console.warn(`⚠️ Відео ${i} не має URI`);
        continue;
      }

      console.log(`📥 Завантаження відео ${i + 1}...`);

      const downloadUrl = uri.includes('?')
        ? `${uri}&key=${process.env.GEMINI_API_KEY}`
        : `${uri}?key=${process.env.GEMINI_API_KEY}`;

      const resp = await fetch(downloadUrl);
      if (!resp.ok) {
        console.error(`❌ Помилка завантаження: ${resp.status} ${resp.statusText}`);
        continue;
      }

      const buffer = await resp.arrayBuffer();
      const timestamp = Date.now();
      const filename = `generated_video_${timestamp}_${i}.mp4`;
      const outputPath = join(videosDir, filename);
      
      await writeFile(outputPath, Buffer.from(buffer));
      
      const fileSizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(2);
      console.log(`✅ Збережено: ${outputPath}`);
      console.log(`📊 Розмір: ${fileSizeMB} MB\n`);
    }

    console.log('🎉 Готово! Всі відео збережено в папку videos/');
    
  } catch (err) {
    console.error('Сталася помилка:', err.message || err);
  }
}

main().catch((e) => console.error('Непередбачена помилка:', e));
