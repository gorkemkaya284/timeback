-- RPC: log_security_event — server-side only (service role). Inserts into tb_security_events.
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_ip TEXT,
  p_user_agent TEXT,
  p_device_fingerprint TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip inet;
  v_ua text;
  v_fp text;
BEGIN
  v_ua := COALESCE(NULLIF(TRIM(p_user_agent), ''), 'unknown');
  v_fp := NULLIF(TRIM(p_device_fingerprint), '');
  IF NULLIF(TRIM(p_ip), '') IS NULL THEN
    v_ip := '0.0.0.0'::inet;
  ELSE
    v_ip := TRIM(p_ip)::inet;
  END IF;
  INSERT INTO tb_security_events (user_id, event_type, ip, user_agent, device_fingerprint, metadata)
  VALUES (p_user_id, p_event_type, v_ip, v_ua, v_fp, COALESCE(p_metadata, '{}'::jsonb));
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO tb_security_events (user_id, event_type, ip, user_agent, device_fingerprint, metadata)
    VALUES (
      p_user_id, p_event_type, '0.0.0.0'::inet, v_ua, v_fp,
      COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('_ip_raw', p_ip, '_err', SQLERRM)
    );
END;
$$;
