import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { type, imageBase64, sessionId, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let prompt = "";
    let model = "google/gemini-3-flash-preview";

    if (type === "face_detection") {
      prompt = `Analyze this webcam image for proctoring purposes. Respond ONLY with valid JSON (no markdown, no code blocks).
      Detect:
      1. How many faces are visible (0, 1, or more)
      2. Is the primary face looking at the screen
      3. Any suspicious behavior (looking away, someone else in frame, phone visible)
      
      Response format: {"faces_count": number, "looking_at_screen": boolean, "suspicious": boolean, "details": "brief description"}`;
    } else if (type === "voice_detection") {
      prompt = `Analyze this audio context for exam proctoring. The user reported voice/sound activity during an exam.
      Based on the metadata provided, assess if this is suspicious.
      Respond ONLY with valid JSON: {"suspicious": boolean, "severity": "warning"|"moderate"|"critical", "details": "brief description"}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid analysis type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const messages: any[] = [{ role: "system", content: "You are an AI proctoring assistant. Analyze exam monitoring data and detect cheating. Always respond with valid JSON only, no markdown formatting." }];

    if (type === "face_detection" && imageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ]
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: false }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    // Parse the AI response - handle potential markdown wrapping
    let analysis;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = { suspicious: false, details: content };
    }

    return new Response(JSON.stringify({ analysis, sessionId, userId, type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("analyze-proctoring error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
