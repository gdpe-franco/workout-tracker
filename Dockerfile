FROM node:24.22.2-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm deploy --filter @workout-tracker/api --prod /prod/api

FROM node:24.22.2-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV WEB_DIST_DIR=/app/web
WORKDIR /app
COPY --from=build /prod/api ./
COPY --from=build /repo/apps/web/dist ./web
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
