CREATE OR REPLACE FUNCTION advance_order_status(p_order uuid, p_next order_status, p_actor uuid) RETURNS order_status
LANGUAGE plpgsql AS $$
DECLARE
  v_order orders;
  v_net integer;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF p_next IN ('received', 'expired') OR NOT order_transition_allowed(v_order.status, p_next, v_order.fulfilment) THEN
    RAISE EXCEPTION 'invalid_transition' USING ERRCODE = 'P0001';
  END IF;

  UPDATE orders SET status = p_next WHERE id = p_order;
  INSERT INTO order_events (order_id, status, actor_id) VALUES (p_order, p_next, p_actor);

  IF p_next IN ('cancelled', 'refunded') AND v_order.customer_id IS NOT NULL THEN
    SELECT coalesce(sum(delta), 0) INTO v_net FROM loyalty_ledger WHERE order_id = p_order;
    IF v_net <> 0 THEN
      INSERT INTO loyalty_ledger (user_id, order_id, delta, reason) VALUES (v_order.customer_id, p_order, -v_net, 'refund');
    END IF;
  END IF;

  RETURN p_next;
END;
$$;
