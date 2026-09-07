package manager

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// Downloads only official release assets, verifies SHA256 before extracting the executable.
type GitHubInstaller struct {
	Client *http.Client
	APIURL string
}

func NewInstaller() *GitHubInstaller {
	return &GitHubInstaller{Client: &http.Client{Timeout: 5 * time.Minute}, APIURL: "https://api.github.com/repos/router-for-me/CLIProxyAPI"}
}
func (g *GitHubInstaller) get(ctx context.Context, url string, max int64) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Orbit-CLIProxy-Manager")
	resp, err := g.Client.Do(req)
	if err != nil {
		return nil, errors.New("release download failed")
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("release download returned HTTP %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, max+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > max {
		return nil, errors.New("release asset exceeds size limit")
	}
	return data, nil
}
func (g *GitHubInstaller) Install(ctx context.Context, root, version string) (string, string, error) {
	route := "/releases/latest"
	if version != "latest" {
		if !validVersion.MatchString(version) {
			return "", "", errors.New("invalid release version")
		}
		route = "/releases/tags/v" + strings.TrimPrefix(version, "v")
	}
	data, err := g.get(ctx, g.APIURL+route, 2<<20)
	if err != nil {
		return "", "", err
	}
	var release struct {
		Tag    string `json:"tag_name"`
		Assets []struct {
			Name string `json:"name"`
			URL  string `json:"browser_download_url"`
		} `json:"assets"`
	}
	if err = json.Unmarshal(data, &release); err != nil {
		return "", "", err
	}
	if !validVersion.MatchString(release.Tag) {
		return "", "", errors.New("release has invalid version")
	}
	if version != "latest" && strings.TrimPrefix(release.Tag, "v") != strings.TrimPrefix(version, "v") {
		return "", "", errors.New("release version mismatch")
	}
	arch := runtime.GOARCH
	if arch == "arm64" {
		arch = "aarch64"
	}
	suffix := "_" + runtime.GOOS + "_" + arch + ".tar.gz"
	var assetURL, assetName, checksURL string
	for _, a := range release.Assets {
		if strings.HasSuffix(a.Name, suffix) {
			assetURL = a.URL
			assetName = a.Name
		}
		if strings.HasSuffix(a.Name, "checksums.txt") {
			checksURL = a.URL
		}
	}
	if assetURL == "" || checksURL == "" {
		return "", "", errors.New("release lacks platform binary or checksums")
	}
	sums, err := g.get(ctx, checksURL, 1<<20)
	if err != nil {
		return "", "", err
	}
	var expected string
	for _, line := range strings.Split(string(sums), "\n") {
		fields := strings.Fields(line)
		if len(fields) == 2 && strings.TrimPrefix(fields[1], "*") == assetName {
			expected = strings.ToLower(fields[0])
		}
	}
	if len(expected) != 64 {
		return "", "", errors.New("binary checksum missing")
	}
	target := filepath.Join(root, "versions", release.Tag)
	if err = os.MkdirAll(filepath.Dir(target), 0700); err != nil {
		return "", "", err
	}
	staging, err := os.MkdirTemp(filepath.Dir(target), ".install-*")
	if err != nil {
		return "", "", err
	}
	defer os.RemoveAll(staging)
	archive, err := os.OpenFile(filepath.Join(staging, "release.tar.gz"), os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return "", "", err
	}
	defer archive.Close()
	req, err := http.NewRequestWithContext(ctx, "GET", assetURL, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("User-Agent", "Orbit-CLIProxy-Manager")
	resp, err := g.Client.Do(req)
	if err != nil {
		return "", "", errors.New("release download failed")
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "", "", fmt.Errorf("release download returned HTTP %d", resp.StatusCode)
	}
	hash := sha256.New()
	size, err := io.Copy(io.MultiWriter(archive, hash), io.LimitReader(resp.Body, (256<<20)+1))
	if err != nil {
		return "", "", err
	}
	if size > 256<<20 {
		return "", "", errors.New("release asset exceeds size limit")
	}
	if hex.EncodeToString(hash.Sum(nil)) != expected {
		return "", "", errors.New("binary checksum mismatch")
	}
	if _, err = archive.Seek(0, io.SeekStart); err != nil {
		return "", "", err
	}
	if err = extractBinary(archive, filepath.Join(staging, "cliproxyapi")); err != nil {
		return "", "", err
	}
	if err = archive.Close(); err != nil {
		return "", "", err
	}
	if err = os.Remove(archive.Name()); err != nil {
		return "", "", err
	}
	// Never overwrite a version in place: it may be the running or rollback binary.
	if _, err = os.Stat(target); err == nil {
		return release.Tag, filepath.Join(target, "cliproxyapi"), nil
	}
	if err = os.Rename(staging, target); err != nil {
		return "", "", err
	}
	return release.Tag, filepath.Join(target, "cliproxyapi"), nil
}
func extractBinary(reader io.Reader, dest string) error {
	gz, err := gzip.NewReader(reader)
	if err != nil {
		return err
	}
	defer gz.Close()
	tr := tar.NewReader(io.LimitReader(gz, 512<<20))
	found := false
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		if h.Typeflag != tar.TypeReg || (filepath.Base(h.Name) != "CLIProxyAPI" && filepath.Base(h.Name) != "cli-proxy-api" && filepath.Base(h.Name) != "cliproxyapi") {
			continue
		}
		if found || h.Size <= 0 || h.Size > 256<<20 {
			return errors.New("invalid executable in release")
		}
		file, err := os.OpenFile(dest, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0700)
		if err != nil {
			return err
		}
		_, err = io.Copy(file, tr)
		if err == nil {
			err = file.Sync()
		}
		closeErr := file.Close()
		if err != nil {
			return err
		}
		if closeErr != nil {
			return closeErr
		}
		found = true
	}
	if !found {
		return errors.New("release executable not found")
	}
	return nil
}
