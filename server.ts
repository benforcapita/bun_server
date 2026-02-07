import { serve } from "bun";
import { createClient } from "@supabase/supabase-js";

// משתני סביבה (נוסיף אותם ב-Render)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "my_secure_token";
const PORT = process.env.PORT || 3000;

// חיבור למסד הנתונים
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log(`🚀 Server starting on port ${PORT}`);

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // --- בדיקת בריאות (ל-UptimeRobot) ---
    if (req.method === "GET" && url.pathname === "/") {
      return new Response("I am alive!", { status: 200 });
    }

    // --- אימות Webhook מול Meta (חד פעמי) ---
    if (req.method === "GET" && url.pathname === "/webhook") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }

    // --- קבלת הודעה מוואטסאפ (POST) ---
    if (req.method === "POST" && url.pathname === "/webhook") {
      try {
        const body = await req.json();

        // ניווט במבנה ה-JSON של מטא כדי למצוא את ההודעה
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
          const phone = message.from; // המספר של השולח
          let text = "";

          // בדיקה אם זו הודעת טקסט או מדיה
          if (message.type === "text") {
            text = message.text.body;
          } else {
            text = `[${message.type.toUpperCase()}]`; // למשל [IMAGE]
          }

          console.log(`📥 New message from ${phone}: ${text}`);

          // שמירה ב-Supabase
          const { error } = await supabase
            .from('messages')
            .insert({
              phone_number: phone,
              content: text,
              direction: 'incoming',
              status: 'unread'
            });

          if (error) {
            console.error("Error saving to DB:", error);
            // אנחנו עדיין מחזירים 200 כדי שמטא לא ינסו לשלוח שוב ושוב אם הבעיה אצלנו ב-DB
          }
        }

        return new Response("OK", { status: 200 });
      } catch (err) {
        console.error(err);
        return new Response("Error", { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});
