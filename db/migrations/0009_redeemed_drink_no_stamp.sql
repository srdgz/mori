CREATE OR REPLACE FUNCTION confirm_order(p_order uuid) RETURNS TABLE(order_id uuid, confirmed_now boolean)
LANGUAGE plpgsql AS $$
DECLARE
  v_order orders;
  v_drinks integer;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF v_order.status NOT IN ('pending_payment', 'expired') THEN
    RETURN QUERY SELECT v_order.id, false;
    RETURN;
  END IF;

  UPDATE orders SET status = 'received', paid_at = now() WHERE id = v_order.id;
  INSERT INTO order_events (order_id, status) VALUES (v_order.id, 'received');

  IF v_order.coupon_id IS NOT NULL THEN
    INSERT INTO coupon_redemptions (coupon_id, order_id, customer_email)
    VALUES (v_order.coupon_id, v_order.id, v_order.contact_email)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_order.customer_id IS NOT NULL THEN
    IF v_order.stamps_redeemed > 0 THEN
      INSERT INTO loyalty_ledger (user_id, order_id, delta, reason)
      VALUES (v_order.customer_id, v_order.id, -v_order.stamps_redeemed, 'redeem');
    END IF;
    SELECT coalesce(sum(quantity), 0) INTO v_drinks FROM order_items WHERE order_items.order_id = v_order.id;
    IF v_order.stamps_redeemed > 0 THEN
      v_drinks := v_drinks - 1;
    END IF;
    IF v_drinks > 0 THEN
      INSERT INTO loyalty_ledger (user_id, order_id, delta, reason)
      VALUES (v_order.customer_id, v_order.id, v_drinks, 'purchase');
    END IF;
  END IF;

  RETURN QUERY SELECT v_order.id, true;
END;
$$;
