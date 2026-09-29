# Развёртывание на NVIDIA Brev

## Текущее размещение

- Сайт: https://qarqaraly-ldk7e3yol.gobrev.dev
- VM: `married-harlequin-smelt`.
- Каталог на сервере: `/home/ubuntu/qarqaraly`.
- Вход: `brev shell married-harlequin-smelt`.
- Перенесены существующие база и фотографии. Повторный seed не требуется.
- SMTP пока не настроен: подтверждение email и восстановление пароля требуют
  настройки почтового сервиса в серверном `.env` и `docker compose up -d app`.
- Локальная копия базы перед переносом: `backups/brev-deploy/database.archive.gz`.
  Она содержит данные пользователей; не публикуйте её и не добавляйте в Git.
- После смены публичного адреса обновите `APP_URL` в серверном `.env` и
  пересоздайте приложение командой `docker compose up -d app`.

Используем существующий Dockerfile и compose.yaml: приложение на порту 3000,
MongoDB во внутренней сети, фотографии и база в постоянных Docker volumes.

## Доступ

Дождитесь готовности VM. На локальном компьютере установите Brev CLI по
https://docs.nvidia.com/brev/cli/cli-overview и выполните:

```sh
brev login
brev refresh
brev shell married-harlequin-smelt
```

В консоли Brev создайте HTTP Secure Link для destination port **3000**.
Существующий порт 8888 относится к notebook. Для публичного туристического
портала разрешите публичный доступ к ссылке. Скопируйте полный HTTPS URL:
его нужно указать как APP_URL без завершающего слеша.

## Файлы и окружение

Передайте проект в отдельную папку на VM, исключив node_modules, .next, .git,
локальные .env, backups и uploads. Локальное окружение не подходит для сервера.
Для переноса существующей базы и пользовательских фотографий нужны отдельные
экспорт MongoDB и копирование uploads; повторное заполнение из seed не переносит
пользователей и внесённые через админку изменения.

На VM нужны Docker Engine и Docker Compose. Создайте .env из .env.example,
задайте права 600 и настройте:

- APP_URL: созданный HTTPS Secure Link или домен сайта.
- APP_PORT: 3000.
- SESSION_SECRET: новый случайный секрет (`openssl rand -hex 32`).
- SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM:
  параметры реальной отправки почты. Локальный Mailpit не отправляет письма
  посетителям; без SMTP подтверждение регистрации и восстановление не работают.

Compose сам задаёт MONGODB_URI и UPLOAD_DIR для контейнеров.

## Запуск на VM

```sh
docker compose up -d --build
```

Это production-сборка, необходимая для запуска, а не отдельный прогон тестов.
Автоматический restart включён. Не открывайте наружу порт MongoDB 27017.

Для новой пустой базы импортируйте редакционные материалы и фотографии:

```sh
docker compose --profile tools run --rm --build tools scripts/seed-editorial.ts
```

При необходимости загрузите ранее подготовленные демонстрационные объекты:

```sh
docker compose --profile tools run --rm -e ALLOW_DEMO_SEED=true tools scripts/seed.ts
```

Создайте администратора, заменив адрес своим:

```sh
docker compose --profile tools run --rm -e ADMIN_EMAIL=you@example.com tools scripts/create-admin.ts
```

Пароль вводится интерактивно. Не сохраняйте его в репозитории.

## Обновления

После передачи изменённых файлов повторите `docker compose up -d --build`.
Volumes сохраняются. Не запускайте `docker compose down -v`: эта команда удаляет
базу и загруженные фотографии. Перед миграциями сохраняйте резервные копии.

Документация подключения и публикации порта:
https://docs.nvidia.com/brev/cli/connectivity
