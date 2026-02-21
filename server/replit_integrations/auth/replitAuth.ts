import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { authStorage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId: string;
    oauthState?: string;
    oauthReturnTo?: string;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function generateState(): string {
  return randomBytes(32).toString("hex");
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const existing = await authStorage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await authStorage.upsertUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
      });

      req.session.userId = user.id;

      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await authStorage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;

      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  // Google OAuth 2.0 - Authorization Code Flow
  app.get("/api/auth/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ message: "Google login is not configured" });
    }

    const state = generateState();
    req.session.oauthState = state;
    const returnTo = req.query.returnTo as string | undefined;
    if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      req.session.oauthReturnTo = returnTo;
    }

    const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "select_account",
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error("Google OAuth error:", error);
        return res.redirect("/auth?error=google_denied");
      }

      if (!code || !state) {
        return res.redirect("/auth?error=google_failed");
      }

      if (state !== req.session.oauthState) {
        console.error("OAuth state mismatch");
        return res.redirect("/auth?error=google_failed");
      }

      delete req.session.oauthState;

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        console.error("Google OAuth credentials not configured");
        return res.redirect("/auth?error=google_failed");
      }
      const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        console.error("Google token exchange failed:", await tokenResponse.text());
        return res.redirect("/auth?error=google_failed");
      }

      const tokenData = await tokenResponse.json();

      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userInfoResponse.ok) {
        console.error("Google user info failed:", await userInfoResponse.text());
        return res.redirect("/auth?error=google_failed");
      }

      const googleUser = await userInfoResponse.json();
      const { id: googleId, email, verified_email, given_name: firstName, family_name: lastName, picture: profileImageUrl } = googleUser;

      if (!email || !verified_email) {
        console.error("Google account email not verified");
        return res.redirect("/auth?error=google_failed");
      }

      // Account linking logic:
      // 1. Check if user exists with this Google ID
      let user = await authStorage.getUserByGoogleId(googleId);

      if (!user) {
        // 2. Check if user exists with this email - link accounts (only if email is verified)
        const existingUser = await authStorage.getUserByEmail(email);
        if (existingUser) {
          user = await authStorage.linkGoogleAccount(existingUser.id, googleId, {
            profileImageUrl: existingUser.profileImageUrl || profileImageUrl,
            firstName: existingUser.firstName || firstName,
            lastName: existingUser.lastName || lastName,
          });
        }
      }

      if (!user) {
        // 3. Create new user
        user = await authStorage.upsertUser({
          email,
          googleId,
          firstName: firstName || null,
          lastName: lastName || null,
          profileImageUrl: profileImageUrl || null,
          password: null,
        });
      }

      req.session.userId = user.id;
      const rawRedirect = req.session.oauthReturnTo || "/";
      delete req.session.oauthReturnTo;
      const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";

      req.session.save(() => {
        res.redirect(redirectTo);
      });
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect("/auth?error=google_failed");
    }
  });

  // Forgot password - request reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await authStorage.getUserByEmail(email);

      const genericMessage = "If an account with that email exists, a reset link has been generated.";

      if (!user || !user.password) {
        return res.json({ message: genericMessage });
      }

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await authStorage.createPasswordResetToken(user.id, token, expiresAt);

      res.json({
        message: genericMessage,
        resetToken: token,
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const resetToken = await authStorage.getValidResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "This reset link has expired or is invalid. Please request a new one." });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await authStorage.updateUserPassword(resetToken.userId, hashedPassword);
      await authStorage.markTokenUsed(resetToken.id);

      res.json({ message: "Password has been reset successfully. You can now sign in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Verify reset token is valid
  app.get("/api/auth/verify-reset-token", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ valid: false });
      }

      const resetToken = await authStorage.getValidResetToken(token);
      res.json({ valid: !!resetToken });
    } catch (error) {
      res.json({ valid: false });
    }
  });

  // Check if Google login is available
  app.get("/api/auth/providers", (_req, res) => {
    res.json({
      google: !!process.env.GOOGLE_CLIENT_ID,
    });
  });
}

function getBaseUrl(req: any): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await authStorage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).user = user;
  next();
};
