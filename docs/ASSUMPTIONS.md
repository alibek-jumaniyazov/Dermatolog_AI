# Amalga oshirish qarorlari

- “and desgin” Ant Design sifatida talqin qilindi. UI uz-Latn, timezone Asia/Tashkent.
- 1–5 JPEG/PNG/WebP, 10 MiB/fayl va 30 MiB/tahlil, 25 MP maksimal, eng qisqa tomon256px.
- Bir case bir kuzatiladigan joy. Analysis retention va roziliklari mustaqil.
- Node22.18 o‘rnatilgani sababli shu versiyaga mos Vite6 va Nest11 tanlandi; lockfile mavjud.
- Docker yo‘q. Lokal PostgreSQL17 binarlaridan alohida cluster55439 yaratildi. 55432 bandligi sababli mavjud processga tegilmadi.
- Lokal private filesystem storage va PostgreSQL durable runner — ishlab chiqish adapterlari. Docker Compose S3 va Redis bilan alohida.
- User OpenAI kaliti taqdim etib integratsiyaga ruxsat berdi. Dastlab `gpt-4o-mini` ishlatilgan. Surat tahlili sifati bo‘yicha qayta ishda account ro‘yxatida mavjud `gpt-5.6-luna` real sinovdan o‘tkazilib joriy model qilindi. API key `.env`da, source/Gitda emas. Yashirin model fallback yo‘q.
- OpenAI — open-source model emas; optional external observations provider. Bu rejimda kalibrlangan kasallik foizi yoki malignancy risk chiqarilmaydi.
- Ochiq weights yetishmagani sababli klinik classifier, avtomatik segmentatsiya, Grad-CAM va offline inference qabul holati alohida ochiq qoladi.
- Tashqi hosting/domain berilmagan; lokal URL va deployment konfiguratsiyasi beriladi.
