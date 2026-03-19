# PVC Visual Configurator AR

Мобильное веб-приложение (Next.js + TypeScript) для визуализации замены старых окон/дверей на новые ПВХ конструкции прямо через камеру смартфона.

## Что реализовано в MVP

- Live-камера через `getUserMedia` (Android/iPhone браузеры)
- AR-подобное наложение ПВХ окна/двери поверх видео
- Управление наложением:
  - drag (перемещение)
  - pinch (масштаб)
  - rotate (поворот)
  - ручная правка 4 углов
- Ассистент выравнивания (легкий edge-based детектор проема)
- Переключение моделей и цветов в реальном времени без сброса сцены
- Переключатель `До / После`
- Снимок результата с брендинг-плашкой
- Шаринг: Web Share API, WhatsApp, Email
- Форма лида (ФИО, телефон, город, категория, модель, цвет, сообщение)
- Backend endpoint `/api/leads`
- Интеграция с Supabase (таблица лидов + optional upload скриншота)
- Fallback сохранения лидов в `tmp/leads-dev.json`, если Supabase не настроен
- 3D modal preview открытия (Three.js):
  - поворотно-откидной
  - боковое открывание
  - глухая + открывающаяся
  - одностворчатая дверь
  - двустворчатая дверь
  - раздвижные системы
  - балконная дверь

UI полностью на русском языке.

## Технологии

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Three.js
- Supabase JS

## Быстрый старт

```bash
npm install
npm run dev
```

Откройте: `http://localhost:3000`

## Переменные окружения

Создайте файл `.env.local` на основе `.env.example`.

```env
NEXT_PUBLIC_COMPANY_NAME="PVC Visual Configurator AR"
NEXT_PUBLIC_ENABLE_ASSISTED_DETECTION=true
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"

SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
SUPABASE_LEADS_TABLE="leads"
SUPABASE_PREVIEW_BUCKET="lead-previews"
```

## Supabase: минимальная схема

```sql
create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  city text not null,
  category text not null,
  model_id text not null,
  model_name text not null,
  color_id text not null,
  color_name text not null,
  message text,
  cta_type text,
  preview_url text,
  created_at timestamptz not null default now()
);
```

Storage bucket (опционально): `lead-previews` (public или private по вашей политике).

## Структура

- `src/app/page.tsx` — главный mobile-first экран
- `src/components/camera/CameraStage.tsx` — live camera stage
- `src/components/overlay/*` — canvas overlay + editor layer
- `src/components/three/Opening3DModal.tsx` — 3D preview открытия
- `src/components/lead/LeadFormSheet.tsx` — лид-форма
- `src/hooks/useCamera.ts` — управление камерой
- `src/hooks/useOverlayEditor.ts` — жесты drag/pinch/rotate/corner
- `src/app/api/leads/route.ts` — backend endpoint
- `src/lib/vision/assistedDetection.ts` — lightweight детектор проема
- `src/lib/render/overlayRenderer.ts` — отрисовка ПВХ рамы
- `src/lib/data/*` — пресеты моделей и цветов

## Команды

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Ограничения и Phase 2

### Реализовано с fallback
- Assisted alignment использует легкий JS edge detection без OpenCV.js.
- 3D preview вынесен в отдельную модалку (чтобы не перегружать live camera слой на мобильных).

### Рекомендуемые улучшения (Phase 2)
- Подключить OpenCV.js quad detection + tracking между кадрами.
- Добавить калибровку масштаба по маркеру/эталонному объекту.
- Вынести lead analytics (utm/source/device) и CRM webhooks.
- Добавить полноценные текстуры ламинации под дерево.
- Реализовать серверный upload captured preview в object storage с сжатием.
