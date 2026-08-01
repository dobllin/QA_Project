// Shim tipe untuk html2pdf.js — library ini tidak menyertakan type
// declarations bawaan. Taruh file ini di root project (sejajar
// tsconfig.json). Cukup ini; modulnya akan dianggap bertipe `any`.
declare module 'html2pdf.js'