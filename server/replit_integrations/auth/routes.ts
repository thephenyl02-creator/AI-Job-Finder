import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { storage } from "../../storage";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.user;
      if (!sessionUser?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const freshUser = await authStorage.getUser(sessionUser.id);
      if (!freshUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { password: _, ...safeUser } = freshUser;

      const isAdmin = await storage.isUserAdmin(freshUser.id);

      const subData = await storage.getUserSubscription(freshUser.id);
      const subscriptionTier = subData?.subscriptionTier || "free";
      const subscriptionStatus = subData?.subscriptionStatus || "inactive";

      const isPro = isAdmin || (subscriptionTier === "pro" && subscriptionStatus === "active");

      res.json({
        ...safeUser,
        isAdmin,
        subscriptionTier,
        subscriptionStatus,
        isPro,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
