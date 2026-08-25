import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("البريد الإلكتروني وكلمة المرور مطلوبان");
        }

        // Throttle password guessing per source IP (not per account, so a
        // victim cannot be locked out by an attacker burning their allowance).
        const hdrs = (req?.headers ?? {}) as Record<string, string | undefined>;
        const ip = (hdrs["x-forwarded-for"]?.split(",")[0].trim()) || hdrs["x-real-ip"] || "unknown";
        const rl = rateLimit(`login:${ip}`, 10, 5 * 60 * 1000);
        if (!rl.ok) {
          throw new Error("محاولات دخول كثيرة. انتظر قليلاً ثم حاول مجدداً.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        }

        if (!user.isActive) {
          throw new Error("تم تعطيل هذا الحساب. تواصل مع الدعم الفني");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in — embed id, role, isActive
        token.id = user.id;
        token.role = (user as unknown as { role: UserRole }).role;
        token.isActive = true;
        token.refreshedAt = Math.floor(Date.now() / 1000);
      } else if (token.id) {
        // Subsequent requests — re-check DB every 5 minutes
        const now = Math.floor(Date.now() / 1000);
        const lastRefresh = (token.refreshedAt as number) || 0;
        if (now - lastRefresh > 300) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, isActive: true },
          });
          if (!dbUser || !dbUser.isActive) {
            token.isActive = false; // will cause session callback to expire the session
          } else {
            token.role = dbUser.role;
            token.isActive = true;
          }
          token.refreshedAt = now;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Banned/deactivated user — return expired session so client logs out
      if (token.isActive === false) {
        return { ...session, expires: new Date(0).toISOString() };
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    isActive?: boolean;
    refreshedAt?: number;
  }
}
