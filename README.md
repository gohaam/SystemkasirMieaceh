<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Mie Aceh Pak Ismail POS

POS berbasis React dengan dukungan aplikasi web dan desktop Electron.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Jalankan aplikasi:
   `npm run dev`

## Deploy ke Netlify

Repository ini sudah memiliki konfigurasi `netlify.toml` dengan pengaturan:

- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirect agar URL customer/table tetap bekerja saat halaman direfresh

Di Netlify, pilih **Add new project > Import an existing project**, hubungkan repository, lalu deploy dengan pengaturan dari `netlify.toml`.

Catatan: versi web saat ini memakai `localStorage` sebagai database offline per-browser. Data belum tersinkron otomatis antar perangkat. Untuk POS online multi-kasir diperlukan backend API dan database server.
