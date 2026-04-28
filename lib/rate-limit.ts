import { createClient, RedisClientType } from 'redis';

// Redis client singleton
let redisClient: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.kasirku_REDIS_URL,
    });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();
  }
  return redisClient;
}

// Rate limiting result type
interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Simple sliding window rate limit using Redis
async function checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<RateLimitResult> {
  const client = await getRedisClient();
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);
  
  // Remove old entries outside the window
  await client.zRemRangeByScore(key, 0, windowStart);
  
  // Count current requests in window
  const currentCount = await client.zCard(key);
  
  if (currentCount >= maxRequests) {
    // Get oldest request to calculate reset time
    const oldest = await client.zRangeWithScores(key, 0, 0);
    const resetTime = oldest.length > 0 ? oldest[0].score + (windowSeconds * 1000) : now + (windowSeconds * 1000);
    
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: resetTime,
    };
  }
  
  // Add current request
  await client.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
  await client.expire(key, windowSeconds);
  
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - currentCount - 1,
    reset: now + (windowSeconds * 1000),
  };
}

// Rate limit configurations
export const ratelimit = {
  // Auth endpoints: 5 attempts per 15 minutes per IP
  auth: {
    limit: async (identifier: string): Promise<RateLimitResult> => {
      return checkRateLimit(`ratelimit:auth:${identifier}`, 5, 15 * 60);
    },
  },

  // Create cashier: 10 attempts per hour per user
  createCashier: {
    limit: async (identifier: string): Promise<RateLimitResult> => {
      return checkRateLimit(`ratelimit:create-cashier:${identifier}`, 10, 60 * 60);
    },
  },

  // General API: 100 requests per minute per IP
  general: {
    limit: async (identifier: string): Promise<RateLimitResult> => {
      return checkRateLimit(`ratelimit:general:${identifier}`, 100, 60);
    },
  },
};

// Helper to get IP from request
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  
  return "unknown";
}
