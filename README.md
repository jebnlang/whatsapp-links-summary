# סיכום לינקים מקבוצות וואטסאפ

אפליקציית ווב לסיכום לינקים מקבוצות וואטסאפ עבור מנהלי קהילות.

## תכונות

- העלאת מספר קבצי זיפ של שיחות וואטסאפ
- חילוץ לינקים מתוך השיחות
- קטגוריזציה וסיכום של הלינקים באמצעות בינה מלאכותית (OpenAI)
- תצוגה נוחה וקלה לשימוש
- אפשרות העתקה של הסיכום לשימוש בקבוצות וואטסאפ

## טכנולוגיות

- Next.js 14
- TypeScript
- Tailwind CSS
- OpenAI API
- JSZip

## התקנה והפעלה

### דרישות מקדימות

- Node.js (גרסה 18 או חדשה יותר)
- מפתח API של OpenAI

### שלבים להתקנה

1. שכפל את המאגר:

```bash
git clone <repository-url>
cd whatsapp-links-summary
```

2. התקן את התלויות:

```bash
npm install
```

3. הגדר את משתני הסביבה:

צור קובץ `.env.local` בתיקיית הפרויקט והוסף את המפתח של OpenAI:

```
OPENAI_API_KEY=your_openai_api_key_here
```

4. הפעל את השרת המקומי:

```bash
npm run dev
```

כעת האפליקציה תפעל בכתובת [http://localhost:3000](http://localhost:3000).

## שימוש

1. גש לאפליקציה בדפדפן שלך.
2. העלה קובץ זיפ אחד או יותר של ייצוא שיחות וואטסאפ.
3. לחץ על "סכם לינקים" כדי לייצר את הסיכום.
4. כאשר הסיכום מוכן, תוכל להעתיק אותו ללוח באמצעות הכפתור המתאים.
