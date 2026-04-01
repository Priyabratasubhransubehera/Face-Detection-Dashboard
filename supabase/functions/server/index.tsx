import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-75f922d3/health", (c) => {
  return c.json({ status: "ok" });
});

// Signup endpoint (passwordless)
app.post("/make-server-75f922d3/signup", async (c) => {
  try {
    const { email, name } = await c.req.json();

    if (!email || !name) {
      return c.json({ error: "Name and email are required" }, 400);
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email);
    
    if (userExists) {
      return c.json({ error: "User with this email already exists" }, 400);
    }

    // Create user with auto-generated password (passwordless flow)
    // User will login with just email, server validates email exists
    const autoPassword = crypto.randomUUID(); // Secure random password
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: autoPassword,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Store user info in KV for quick lookup
    await kv.set(`user:${email}`, {
      id: data.user?.id,
      email: data.user?.email,
      name,
      createdAt: new Date().toISOString()
    });

    return c.json({ 
      message: "User created successfully", 
      user: { 
        id: data.user?.id, 
        email: data.user?.email,
        user_metadata: { name }
      }
    }, 201);
  } catch (error) {
    console.log(`Signup error during main signup flow: ${error}`);
    return c.json({ error: "Internal server error during signup" }, 500);
  }
});

// Signin endpoint (passwordless - email only)
app.post("/make-server-75f922d3/signin", async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    // Check if user exists in KV store
    const userData = await kv.get(`user:${email}`);
    
    if (!userData) {
      console.log(`Login attempt for non-existent user: ${email}`);
      return c.json({ error: "User not found. Please sign up first." }, 404);
    }

    // Validate user exists in Supabase auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const user = existingUsers?.users?.find(u => u.email === email);
    
    if (!user) {
      console.log(`User ${email} not found in Supabase auth`);
      return c.json({ error: "User not found. Please sign up first." }, 404);
    }

    console.log(`✅ Successful login for user: ${email}`);

    return c.json({ 
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      }
    }, 200);
  } catch (error) {
    console.log(`Signin error during main login flow: ${error}`);
    return c.json({ error: "Internal server error during signin" }, 500);
  }
});

Deno.serve(app.fetch);