package manager

import (
	"os"
	"runtime"
	"strconv"
	"strings"
	"syscall"
)

type Metrics struct {
	ManagerHeapBytes     uint64   `json:"managerHeapBytes"`
	DiskAvailableBytes   *uint64  `json:"diskAvailableBytes,omitempty"`
	MemoryTotalBytes     *uint64  `json:"memoryTotalBytes,omitempty"`
	MemoryAvailableBytes *uint64  `json:"memoryAvailableBytes,omitempty"`
	Load1                *float64 `json:"load1,omitempty"`
}

func metrics(root string) Metrics {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	m := Metrics{ManagerHeapBytes: mem.HeapAlloc}
	var stat syscall.Statfs_t
	if syscall.Statfs(root, &stat) == nil {
		available := uint64(stat.Bavail) * uint64(stat.Bsize)
		m.DiskAvailableBytes = &available
	}
	// Linux host/container metrics: unavailable values stay absent, never synthetic zeros.
	if data, err := os.ReadFile("/proc/meminfo"); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			f := strings.Fields(line)
			if len(f) < 2 {
				continue
			}
			n, err := strconv.ParseUint(f[1], 10, 64)
			if err != nil {
				continue
			}
			n *= 1024
			switch f[0] {
			case "MemTotal:":
				m.MemoryTotalBytes = &n
			case "MemAvailable:":
				m.MemoryAvailableBytes = &n
			}
		}
	}
	if data, err := os.ReadFile("/proc/loadavg"); err == nil {
		fields := strings.Fields(string(data))
		if len(fields) > 0 {
			if value, err := strconv.ParseFloat(fields[0], 64); err == nil {
				m.Load1 = &value
			}
		}
	}
	return m
}
