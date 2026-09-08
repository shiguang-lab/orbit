package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"orbit/cliproxy-manager/internal/manager"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
func main() {
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		addr := env("CLIPROXY_MANAGER_LISTEN", "0.0.0.0:8792")
		addr = strings.Replace(addr, "0.0.0.0:", "127.0.0.1:", 1)
		c := http.Client{Timeout: 3 * time.Second}
		r, err := c.Get("http://" + addr + "/healthz")
		if err != nil {
			os.Exit(1)
		}
		r.Body.Close()
		if r.StatusCode != 200 {
			os.Exit(1)
		}
		return
	}
	hostname, _ := os.Hostname()
	interval, err := time.ParseDuration(env("CLIPROXY_MANAGER_INTERVAL", "15s"))
	if err != nil {
		log.Fatal(err)
	}
	nodeName := env("CLIPROXY_MANAGER_NAME", hostname)
	if nodeName == "" {
		nodeName = "NAS"
	}
	cfg := manager.Config{
		Listen:    env("CLIPROXY_MANAGER_LISTEN", "0.0.0.0:8792"),
		DataDir:   env("CLIPROXY_MANAGER_DATA_DIR", "./data"),
		NodeID:    env("CLIPROXY_MANAGER_ID", "nas"),
		NodeName:  nodeName,
		ReportURL: os.Getenv("CLIPROXY_MANAGER_REPORT_URL"),
		Interval:  interval,
	}
	m, err := manager.NewManager(cfg, manager.NewInstaller())
	if err != nil {
		log.Fatal(err)
	}
	defer m.Close()
	m.Run()
	server := &http.Server{Addr: cfg.Listen, Handler: m.Handler(), ReadHeaderTimeout: 10 * time.Second, IdleTimeout: 90 * time.Second, MaxHeaderBytes: 32 << 10}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()
	done := make(chan error, 1)
	go func() {
		fmt.Printf("Orbit node %s listening on %s\n", cfg.NodeID, cfg.Listen)
		done <- server.ListenAndServe()
	}()
	select {
	case <-ctx.Done():
	case err := <-done:
		if err != http.ErrServerClosed {
			log.Printf("node server: %v", err)
		}
	}
	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(shutdown)
}
