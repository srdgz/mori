"use client";

import Link from "next/link";
import "@/styles/globals.css";

type Props = { error: Error & { digest?: string }; retry: () => void };

export default function GlobalError({ error, retry }: Props) {
  return (
    <html lang="es">
      <body>
        <title>MŌRI — Se nos ha derramado algo · We spilled something</title>
        <main className="error-page">
          <div className="wrap">
            <h1 className="display text-[clamp(2.4rem,7vw,5rem)] text-forest">Se nos ha derramado algo</h1>
            <p className="lede mx-auto mt-5">Algo ha fallado de nuestro lado. Vuelve a intentarlo en un momento.</p>
            <p className="lede mx-auto mt-3" lang="en">
              We spilled something. Something went wrong on our side: try again in a moment.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <button type="button" className="btn" onClick={() => retry()}>
                Reintentar · <span lang="en">Try again</span>
              </button>
              <Link className="btn btn--ghost" href="/">
                Inicio · <span lang="en">Home</span>
              </Link>
            </div>
            {error.digest && <p className="error-page__ref">Ref. {error.digest}</p>}
          </div>
        </main>
      </body>
    </html>
  );
}
