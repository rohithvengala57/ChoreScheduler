import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null };
}

async function resolveURI(): Promise<string> {
  const configured = process.env.MONGODB_URI || "";

  // If a real URI is explicitly set (non-localhost), trust it
  if (configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")) {
    return configured;
  }

  // In development: try the configured URI first; if MongoDB isn't
  // running locally, spin up an in-memory server automatically.
  if (configured) {
    try {
      const testConn = await mongoose.createConnection(configured, {
        serverSelectionTimeoutMS: 2000,
        bufferCommands: false,
      }).asPromise();
      await testConn.close();
      return configured; // real local MongoDB is running — use it
    } catch {
      // fall through to in-memory
    }
  }

  // Start (or reuse) an in-memory MongoDB instance
  const { MongoMemoryServer } = await import("mongodb-memory-server");

  // Reuse across hot-reloads
  const g = global as typeof global & { _memServer?: InstanceType<typeof MongoMemoryServer> };
  if (!g._memServer) {
    g._memServer = await MongoMemoryServer.create();
    console.info(
      "⚡ mongodb-memory-server started — data lives in RAM only (restart = fresh DB)"
    );
  }

  return g._memServer.getUri();
}

export async function connectDB(): Promise<typeof mongoose> {
  const cache = global._mongooseCache;

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = resolveURI().then((uri) =>
      mongoose.connect(uri, { bufferCommands: false })
    );
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
