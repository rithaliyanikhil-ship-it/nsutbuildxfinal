import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { sessionId, violationType, severity, description, metadata } = await req.json();

    // Record the violation
    const { data: violation, error: violationError } = await supabase
      .from('violations')
      .insert({
        session_id: sessionId,
        user_id: userId,
        violation_type: violationType,
        severity: severity || 'warning',
        description,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (violationError) throw violationError;

    // Update session violation count
    const { data: session } = await supabase
      .from('exam_sessions')
      .select('total_violations, exam_id')
      .eq('id', sessionId)
      .single();

    const newCount = (session?.total_violations || 0) + 1;

    // Check if max violations exceeded
    const { data: exam } = await supabase
      .from('exams')
      .select('max_violations')
      .eq('id', session?.exam_id)
      .single();

    const shouldTerminate = newCount >= (exam?.max_violations || 5);

    const updateData: any = {
      total_violations: newCount,
      is_flagged: severity === 'critical' || newCount >= 3,
    };

    if (shouldTerminate) {
      updateData.status = 'terminated';
      updateData.termination_reason = `Max violations exceeded (${newCount}/${exam?.max_violations})`;
      updateData.completed_at = new Date().toISOString();
    }

    await supabase
      .from('exam_sessions')
      .update(updateData)
      .eq('id', sessionId);

    return new Response(JSON.stringify({
      violation,
      totalViolations: newCount,
      terminated: shouldTerminate,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("record-violation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
