CREATE VIEW loyalty_balance AS
  SELECT user_id, sum(delta)::int AS stamps FROM loyalty_ledger GROUP BY user_id;
--> statement-breakpoint
CREATE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER orders_touch_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER products_touch_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE FUNCTION order_transition_allowed(p_from order_status, p_to order_status, p_fulfilment fulfilment_kind)
RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM (VALUES
      ('pending_payment'::order_status, 'received'::order_status),
      ('pending_payment', 'expired'),
      ('received', 'preparing'),
      ('received', 'cancelled'),
      ('received', 'refunded'),
      ('preparing', 'ready'),
      ('preparing', 'out_for_delivery'),
      ('preparing', 'refunded'),
      ('ready', 'completed'),
      ('ready', 'refunded'),
      ('out_for_delivery', 'completed'),
      ('out_for_delivery', 'refunded'),
      ('completed', 'refunded'),
      ('expired', 'received')
    ) AS t(from_status, to_status)
    WHERE t.from_status = p_from AND t.to_status = p_to
  )
  AND NOT (p_to = 'ready' AND p_fulfilment <> 'pickup')
  AND NOT (p_to = 'out_for_delivery' AND p_fulfilment <> 'delivery')
$$;
--> statement-breakpoint
CREATE FUNCTION slot_occupied_by(p_status order_status, p_created_at timestamptz, p_hold_minutes integer)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN p_status IN ('cancelled', 'expired', 'refunded') THEN false
    WHEN p_status = 'pending_payment' THEN p_created_at > now() - make_interval(mins => p_hold_minutes)
    ELSE true
  END
$$;
--> statement-breakpoint
CREATE FUNCTION create_order(p_order jsonb, p_items jsonb) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_slot timestamptz := (p_order ->> 'slot_start')::timestamptz;
  v_capacity integer;
  v_hold integer;
  v_load integer;
  v_id uuid;
BEGIN
  SELECT slot_capacity, unpaid_hold_minutes INTO v_capacity, v_hold FROM store_settings WHERE id = 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'store_settings_missing';
  END IF;

  IF v_slot IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('slot:' || v_slot::text, 0));
    SELECT count(*) INTO v_load FROM orders
      WHERE slot_start = v_slot AND slot_occupied_by(status, created_at, v_hold);
    IF v_load >= v_capacity THEN
      RAISE EXCEPTION 'slot_full' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO orders (
    code, customer_id, contact_name, contact_email, contact_phone, locale, fulfilment,
    scheduled_for, slot_start, delivery_address, notes, subtotal_cents, discount_cents,
    delivery_fee_cents, total_cents, vat_cents, coupon_id, stamps_redeemed, is_demo
  ) VALUES (
    p_order ->> 'code',
    (p_order ->> 'customer_id')::uuid,
    p_order ->> 'contact_name',
    p_order ->> 'contact_email',
    p_order ->> 'contact_phone',
    p_order ->> 'locale',
    (p_order ->> 'fulfilment')::fulfilment_kind,
    (p_order ->> 'scheduled_for')::timestamptz,
    v_slot,
    p_order -> 'delivery_address',
    p_order ->> 'notes',
    (p_order ->> 'subtotal_cents')::integer,
    coalesce((p_order ->> 'discount_cents')::integer, 0),
    coalesce((p_order ->> 'delivery_fee_cents')::integer, 0),
    (p_order ->> 'total_cents')::integer,
    (p_order ->> 'vat_cents')::integer,
    (p_order ->> 'coupon_id')::uuid,
    coalesce((p_order ->> 'stamps_redeemed')::integer, 0),
    coalesce((p_order ->> 'is_demo')::boolean, false)
  ) RETURNING id INTO v_id;

  INSERT INTO order_items (order_id, product_id, product_name, options, unit_price_cents, quantity, line_total_cents)
  SELECT v_id, i.product_id, i.product_name, i.options, i.unit_price_cents, i.quantity, i.line_total_cents
  FROM jsonb_to_recordset(p_items) AS i(
    product_id uuid, product_name text, options jsonb, unit_price_cents integer, quantity integer, line_total_cents integer
  );

  INSERT INTO order_events (order_id, status) VALUES (v_id, 'pending_payment');
  RETURN v_id;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION confirm_payment(p_payment_intent text) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_order orders;
  v_drinks integer;
BEGIN
  SELECT * INTO v_order FROM orders WHERE payment_intent_id = p_payment_intent FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF v_order.status NOT IN ('pending_payment', 'expired') THEN
    RETURN v_order.id;
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
    SELECT coalesce(sum(quantity), 0) INTO v_drinks FROM order_items WHERE order_id = v_order.id;
    IF v_drinks > 0 THEN
      INSERT INTO loyalty_ledger (user_id, order_id, delta, reason)
      VALUES (v_order.customer_id, v_order.id, v_drinks, 'purchase');
    END IF;
  END IF;

  RETURN v_order.id;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION advance_order_status(p_order uuid, p_next order_status, p_actor uuid) RETURNS order_status
LANGUAGE plpgsql AS $$
DECLARE
  v_order orders;
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
  RETURN p_next;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION expire_unpaid_orders() RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  v_hold integer;
  v_count integer;
BEGIN
  SELECT unpaid_hold_minutes INTO v_hold FROM store_settings WHERE id = 1;
  WITH expired AS (
    UPDATE orders SET status = 'expired'
    WHERE status = 'pending_payment' AND created_at <= now() - make_interval(mins => coalesce(v_hold, 30))
    RETURNING id
  ), events AS (
    INSERT INTO order_events (order_id, status) SELECT id, 'expired' FROM expired RETURNING 1
  )
  SELECT count(*) INTO v_count FROM events;
  RETURN v_count;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION anonymize_customer(p_user uuid) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE orders SET
    contact_name = 'Deleted customer',
    contact_email = 'deleted+' || id || '@invalid',
    contact_phone = '',
    notes = NULL,
    delivery_address = CASE WHEN delivery_address IS NULL THEN NULL ELSE '{"anonymized": true}'::jsonb END
  WHERE customer_id = p_user;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE users SET
    name = 'Deleted customer',
    email = 'deleted+' || id || '@invalid',
    phone = NULL,
    image = NULL,
    marketing_opt_in = false,
    deleted_at = now()
  WHERE id = p_user;

  RETURN v_count;
END;
$$;
