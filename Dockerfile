# The SPA is static, so build it once on the native platform for every target arch.
FROM --platform=$BUILDPLATFORM oven/bun:1.4 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG FAULTLINE_VERSION=dev
ENV VITE_FAULTLINE_VERSION=$FAULTLINE_VERSION
# /app/root is the build for the root, so a container without BASE_PATH serves it as is and writes nothing.
RUN bun run build && cp -r dist root && sh docker/set-base.sh root ''

FROM caddy:2-alpine
LABEL org.opencontainers.image.title="Faultline" \
      org.opencontainers.image.description="A modern frontend for GlitchTip" \
      org.opencontainers.image.source="https://github.com/snnbotchway/faultline" \
      org.opencontainers.image.licenses="MIT"
ENV PORT=8080
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/root /srv
COPY --from=build /app/dist /app/dist
COPY --chmod=755 docker/entrypoint.sh docker/set-base.sh /app/
EXPOSE 8080
USER 1000
ENTRYPOINT ["/app/entrypoint.sh"]
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT}/_faultline/health >/dev/null || exit 1
