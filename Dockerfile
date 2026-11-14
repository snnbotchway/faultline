# The SPA is static, so build it once on the native platform for every target arch.
FROM --platform=$BUILDPLATFORM oven/bun:1.4 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG FAULTLINE_VERSION=dev
ENV VITE_FAULTLINE_VERSION=$FAULTLINE_VERSION
RUN bun run build

FROM caddy:2-alpine
LABEL org.opencontainers.image.title="Faultline" \
      org.opencontainers.image.description="A modern frontend for GlitchTip" \
      org.opencontainers.image.source="https://github.com/snnbotchway/faultline" \
      org.opencontainers.image.licenses="MIT"
ENV PORT=8080
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /app/dist
COPY --chmod=755 docker/entrypoint.sh /entrypoint.sh
EXPOSE 8080
USER 1000
ENTRYPOINT ["/entrypoint.sh"]
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT}/_faultline/health >/dev/null || exit 1
