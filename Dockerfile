# משתמשים בתמונה הרשמית של Bun
FROM oven/bun:1

# מגדירים את תיקיית העבודה
WORKDIR /app

# מעתיקים את קבצי הפרויקט לתוך השרת
COPY . .

# מתקינים את הספריות (כמו supabase)
RUN bun install

# הפקודה שתריץ את השרת
CMD ["bun", "run", "server.ts"]
