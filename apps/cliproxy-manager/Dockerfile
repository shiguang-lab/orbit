FROM --platform=$BUILDPLATFORM golang:1.26-bookworm AS build
ARG TARGETOS=linux
ARG TARGETARCH
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags='-s -w' -o /orbit-cliproxy-manager ./cmd/cliproxy-manager

FROM debian:bookworm-slim AS cliproxy-manager
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libstdc++6 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 10001 --create-home agent \
    && mkdir /data && chown agent:agent /data
COPY --from=build /orbit-cliproxy-manager /usr/local/bin/orbit-cliproxy-manager
USER agent
ENV CLIPROXY_MANAGER_DATA_DIR=/data CLIPROXY_MANAGER_LISTEN=0.0.0.0:8792
VOLUME /data
EXPOSE 8792
HEALTHCHECK --interval=30s --timeout=5s CMD ["/usr/local/bin/orbit-cliproxy-manager", "healthcheck"]
ENTRYPOINT ["/usr/local/bin/orbit-cliproxy-manager"]
