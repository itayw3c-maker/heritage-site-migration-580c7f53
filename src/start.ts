import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

// Project-specific replacement for the generated `attachSupabaseAuth`: identical
// behaviour, but the Supabase auth client (~300KB) is imported dynamically so it
// stays out of the client entry chunk instead of blocking first paint.
const attachSupabaseAuthLazy = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
    } catch {
      return next({ headers: {} });
    }
  },
);

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuthLazy],
  requestMiddleware: [errorMiddleware],
}));
