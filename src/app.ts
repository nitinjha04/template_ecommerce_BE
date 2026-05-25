import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/error.middleware";
import routes from "./routes";

const app = express();
const uploadsDir = path.join(process.cwd(), "uploads");
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://template-ecommerce-fe.vercel.app",
];
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  "/uploads",
  express.static(uploadsDir, { maxAge: env.nodeEnv === "production" ? "7d" : 0 }),
);

app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
