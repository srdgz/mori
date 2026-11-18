import { randomInt } from "node:crypto";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

type Placed = { id: string; code: string; token: string };

const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function code(): string {
  return `MR-${Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("")}`;
}

async function lineFor(slug: string, quantity: number) {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    price: number;
    options: { group: string; code: string; name: unknown; priceDeltaCents: number }[];
  }>(
    `select p.id, p.name, p.base_price_cents as price,
            coalesce(json_agg(json_build_object('group', g.code, 'code', o.code, 'name', o.name, 'priceDeltaCents', o.price_delta_cents))
              filter (where o.id is not null), '[]') as options
       from products p
       left join product_option_groups pg on pg.product_id = p.id
       left join option_groups g on g.id = pg.group_id
       left join lateral (
         select * from options x where x.group_id = g.id and (x.id = pg.default_option_id or (pg.default_option_id is null and g.required))
         order by x.sort limit 1
       ) o on true
      where p.slug = $1
      group by p.id`,
    [slug],
  );
  const product = rows[0];
  if (!product) throw new Error(`No product ${slug}`);
  const unit = product.price + product.options.reduce((sum, o) => sum + o.priceDeltaCents, 0);
  return {
    product_id: product.id,
    product_name: product.name,
    options: product.options,
    unit_price_cents: unit,
    quantity,
    line_total_cents: unit * quantity,
  };
}

export async function placePaidOrder(options: {
  email: string;
  customerEmail?: string;
  slug?: string;
  quantity?: number;
  slotStart?: Date;
  isDemo?: boolean;
  notes?: string;
}): Promise<Placed> {
  const item = await lineFor(options.slug ?? "classic-matcha", options.quantity ?? 2);
  const customer = options.customerEmail
    ? (await pool.query<{ id: string }>(`select id from users where email = $1`, [options.customerEmail])).rows[0]?.id
    : null;
  const total = item.line_total_cents;
  const slot = options.slotStart ?? new Date(Date.UTC(2030, 0, 1 + randomInt(0, 3000), 10, randomInt(0, 16) * 15));
  const order = {
    code: code(),
    customer_id: customer ?? null,
    contact_name: "Ana",
    contact_email: options.email,
    contact_phone: "600000000",
    locale: "es",
    fulfilment: "pickup",
    slot_start: slot.toISOString(),
    notes: options.notes ?? null,
    is_demo: options.isDemo ?? false,
    subtotal_cents: total,
    discount_cents: 0,
    delivery_fee_cents: 0,
    total_cents: total,
    vat_cents: Math.round(total - total / 1.1),
    coupon_id: null,
  };
  const { rows } = await pool.query<{ id: string }>(`select create_order($1::jsonb, $2::jsonb) as id`, [
    JSON.stringify(order),
    JSON.stringify([item]),
  ]);
  const id = rows[0]!.id;
  const intent = `pi_e2e_${order.code}`;
  await pool.query(`update orders set payment_intent_id = $2 where id = $1`, [id, intent]);
  await pool.query(`select * from confirm_payment($1)`, [intent]);
  const token = (await pool.query<{ tracking_token: string }>(`select tracking_token from orders where id = $1`, [id])).rows[0]!
    .tracking_token;
  return { id, code: order.code, token };
}

export async function advanceOrder(id: string, next: string): Promise<void> {
  await pool.query(`select advance_order_status($1, $2, null)`, [id, next]);
}

export async function setRole(email: string, role: "customer" | "staff" | "admin"): Promise<void> {
  await pool.query(`update users set role = $2 where email = $1`, [email, role]);
}

export async function orderStatus(code: string): Promise<string> {
  return (await pool.query<{ status: string }>(`select status from orders where code = $1`, [code])).rows[0]!.status;
}
