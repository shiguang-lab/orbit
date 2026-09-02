/**
 * 应用外壳：antd Layout（Sider 菜单 + Header + Content/Outlet）。
 * 菜单图标与线上 OmniRoute Orbit 侧栏保持一致。
 */
import {
  Layout,
  Menu,
  Button,
  Typography,
  Dropdown,
  Input,
  type MenuProps,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { NAV_SECTIONS, MaterialIcon, NavIcon, applySidebarSettings, flattenNav, localizeNav, navTitleForPath } from "@/app/nav";
import { useThemeMode } from "@/theme/useThemeMode";
import { useI18n, type AppLocale } from "@/i18n";
import { performLogout, getAuthSession } from "@/auth/session";
import { settingsApi } from "@/entities/api";
import { Scrollbar } from "@shiguang2/components/esm/scrollbar";
import { useBreadcrumbTitle } from "@/shell/useBreadcrumbTitle";

const { Sider, Header, Content } = Layout;

export function Shell() {
  const [collapsed, setCollapsed] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggle } = useThemeMode();
  const { locale, setLocale, t } = useI18n();
  const session = getAuthSession();
  const customTitle = useBreadcrumbTitle((s) => s.customTitle);
  const sidebarSettingsQuery = useQuery({
    queryKey: ["settings", "sidebar"],
    queryFn: () => settingsApi.sidebar(),
    staleTime: 60_000,
  });
  const navSections = useMemo(
    () => applySidebarSettings(localizeNav(NAV_SECTIONS, locale), sidebarSettingsQuery.data),
    [locale, sidebarSettingsQuery.data],
  );
  const visibleNavSections = useMemo(() => {
    const query = menuSearch.trim().toLocaleLowerCase();
    if (!query) return navSections;
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          `${section.title} ${item.label}`.toLocaleLowerCase().includes(query),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [menuSearch, navSections]);

  const activeSectionKey = useMemo(() => {
    const pathname = location.pathname;
    const flat = flattenNav(navSections);
    const hit = flat.find((item) => pathname.startsWith(item.to));
    if (!hit) return "analytics";
    const parent = navSections.find((s) => s.items.some((i) => i.key === hit.key));
    return parent ? parent.key : "analytics";
  }, [location.pathname, navSections]);

  const [openKeys, setOpenKeys] = useState<string[]>(() => [activeSectionKey]);

  // Keep active section open on navigation
  useEffect(() => {
    if (activeSectionKey && !openKeys.includes(activeSectionKey)) {
      setOpenKeys((prev) => [...prev, activeSectionKey]);
    }
  }, [activeSectionKey]);

  const selectedKeys = useMemo(() => {
    const pathname = location.pathname;
    const flat = flattenNav(navSections);
    // 1. Exact match
    const exact = flat.find((item) => item.to === pathname);
    if (exact) return [exact.key];

    // 2. Longest prefix match (avoid /dashboard/combos matching /dashboard/combos/live)
    const sorted = [...flat].sort((a, b) => b.to.length - a.to.length);
    const hit = sorted.find(
      (item) => item.to !== "/" && item.to !== "/home" && pathname.startsWith(item.to)
    );
    return hit ? [hit.key] : [];
  }, [location.pathname, navSections]);

  const menuItems: MenuProps["items"] = visibleNavSections.map((section) => {
    if (section.items.length === 1 && section.items[0].key === section.key) {
      const singleItem = section.items[0];
      return {
        key: singleItem.key,
        label: singleItem.label,
        icon: singleItem.icon ? <NavIcon name={singleItem.icon} itemKey={singleItem.key} /> : undefined,
      };
    }

    return {
      key: section.key,
      label: section.title,
      icon: section.icon ? <NavIcon name={section.icon} itemKey={`section-${section.key}`} /> : undefined,
      children: section.items.map((item) => ({
        key: item.key,
        label: item.label,
        icon: item.icon ? <NavIcon name={item.icon} itemKey={item.key} /> : undefined,
      })),
    };
  });

  const userMenu: MenuProps["items"] = [
    {
      key: "user-info",
      disabled: true,
      label: (
        <div style={{ padding: "4px 0" }}>
          <div style={{ fontWeight: 600, color: "inherit", fontSize: 13 }}>
            {session?.displayName || "Admin"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(128,128,128,0.75)" }}>
            {session?.email || session?.id || "system:admin"}
          </div>
        </div>
      ),
    },
    { type: "divider" },
    {
      key: "logout",
      label: t("shell.logout"),
      icon: <MaterialIcon name="logout" />,
      onClick: () => {
        void performLogout();
      },
    },
  ];

  const title = navTitleForPath(location.pathname, navSections);

  const breadcrumbs = useMemo(() => {
    const pathname = location.pathname;
    const flat = flattenNav(navSections);
    const searchParams = new URLSearchParams(location.search);
    const apiKeyIds = searchParams.get("apiKeyIds");

    // 0. Analytics with filtered key
    if (pathname === "/dashboard/analytics" && (customTitle || apiKeyIds)) {
      const parent = flat.find((it) => it.to === "/dashboard/analytics");
      const truncatedKey = apiKeyIds
        ? apiKeyIds.length > 18
          ? `${apiKeyIds.slice(0, 8)}...${apiKeyIds.slice(-6)}`
          : apiKeyIds
        : null;
      const keyLabel = customTitle || (truncatedKey ? `密钥: ${truncatedKey}` : null);
      return [
        { label: parent ? parent.label : "用量", to: "/dashboard/analytics" },
        ...(keyLabel ? [{ label: keyLabel }] : []),
      ];
    }

    // 0. Exact match (e.g. /dashboard/combos/live, /dashboard/providers)
    const exact = flat.find((it) => it.to === pathname);
    if (exact) {
      return [{ label: exact.label }];
    }

    // 1. Combos Control Center (dynamic ID subpage)
    if (/^\/dashboard\/combos\/[^/]+$/.test(pathname)) {
      const parent = flat.find((it) => it.to === "/dashboard/combos");
      return [
        { label: parent ? parent.label : "组合", to: "/dashboard/combos" },
        { label: customTitle || "组合详情" },
      ];
    }

    // 2. Provider subpages
    if (pathname === "/dashboard/providers/new") {
      const parent = flat.find((it) => it.to === "/dashboard/providers");
      return [
        { label: parent ? parent.label : "提供者", to: "/dashboard/providers" },
        { label: "新建提供者" },
      ];
    }
    if (/^\/dashboard\/providers\/[^/]+\/connections\/[^/]+$/.test(pathname)) {
      const parent = flat.find((it) => it.to === "/dashboard/providers");
      return [
        { label: parent ? parent.label : "提供者", to: "/dashboard/providers" },
        { label: "编辑提供者" },
      ];
    }
    if (/^\/dashboard\/providers\/[^/]+$/.test(pathname)) {
      const parent = flat.find((it) => it.to === "/dashboard/providers");
      return [
        { label: parent ? parent.label : "提供者", to: "/dashboard/providers" },
        { label: "提供者详情" },
      ];
    }

    // Prefix match
    const sorted = [...flat].sort((a, b) => b.to.length - a.to.length);
    for (const item of sorted) {
      if (pathname.startsWith(item.to) && item.to !== "/" && item.to !== "/home") {
        return [{ label: item.label }];
      }
    }

    return [{ label: title }];
  }, [location.pathname, location.search, navSections, title, customTitle]);

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={250}
        collapsedWidth={64}
        className="sidebar-sider"
      >
        <div className="sidebar-header" role="banner">
          <div className="sidebar-brand-mark" aria-hidden="true">
            <MaterialIcon name="hub" />
          </div>
          {!collapsed && (
            <div className="sidebar-brand-copy">
              <Typography.Text strong>{locale === "zh-CN" ? "智枢" : "Orbit"}</Typography.Text>
              <Typography.Text type="secondary">{t("shell.brandSubtitle")}</Typography.Text>
            </div>
          )}

        </div>
        {!collapsed && (
          <div className="sidebar-menu-search">
            <Input
              allowClear
              value={menuSearch}
              onChange={(event) => setMenuSearch(event.target.value)}
              prefix={<MaterialIcon name="search" />}
              placeholder={t("shell.menuSearch")}
              aria-label={t("shell.menuSearch")}
            />
          </div>
        )}
        <Scrollbar
          className="sidebar-scrollbar"
          scrollX={false}
          style={{ flex: "1 1 0%", minHeight: 0, height: 0 }}
        >
          <Menu
            mode="inline"
            theme="dark"
            className="sidebar-menu"
            inlineIndent={14}
            inlineCollapsed={collapsed}
            selectedKeys={selectedKeys}
            openKeys={collapsed ? undefined : openKeys}
            onOpenChange={setOpenKeys}
            items={menuItems}
            onClick={({ key }) => {
              const item = flattenNav(navSections).find((i) => i.key === key);
              if (item) {
                if (item.to.startsWith("http")) {
                  window.open(item.to, "_blank");
                } else {
                  navigate(item.to);
                }
              }
            }}
            style={{ borderInlineEnd: "none", background: "transparent" }}
          />
        </Scrollbar>
      </Sider>

      <Layout style={{ minHeight: 0 }}>
        <Header
          className="app-header"
        >
          <div className="app-header-left">
            <Button
              type="text"
              icon={<MaterialIcon name={collapsed ? "menu" : "menu_open"} />}
              onClick={() => setCollapsed((c) => !c)}
              aria-label={t("shell.toggleSidebar")}
            />
            <div className="app-breadcrumb" aria-label={t("shell.currentLocation")}>
              {location.pathname === "/home" || location.pathname === "/" ? (
                <>
                  <MaterialIcon name="home" />
                  <span className="app-breadcrumb-current">{t("nav.item.home")}</span>
                  <Typography.Text type="secondary">{t("shell.homeWelcome")}</Typography.Text>
                </>
              ) : (
                <>
                  <Typography.Text type="secondary">{t("shell.dashboard")}</Typography.Text>
                  {breadcrumbs.map((crumb, idx) => (
                    <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span aria-hidden="true" style={{ opacity: 0.45 }}>›</span>
                      {crumb.to ? (
                        <Link to={crumb.to} style={{ color: "inherit", textDecoration: "none" }}>
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="app-breadcrumb-current">{crumb.label}</span>
                      )}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="app-header-tools">
            <Input
              className="app-global-search"
              allowClear
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              prefix={<MaterialIcon name="search" />}
              placeholder={t("shell.globalSearch")}
              aria-label={t("shell.globalSearchLabel")}
              suffix={<Typography.Text type="secondary" style={{ fontSize: 11 }}>⌘K</Typography.Text>}
            />
            <Button
              type="text"
              icon={<MaterialIcon name={mode === "dark" ? "light_mode" : "dark_mode"} />}
              onClick={toggle}
              aria-label={t("shell.toggleTheme")}
            />
            <Dropdown
              menu={{
                selectedKeys: [locale],
                onClick: ({ key }) => setLocale(key as AppLocale),
                items: [
                  { key: "zh-CN", label: t("language.chinese") },
                  { key: "en-US", label: t("language.english") },
                ],
              }}
              placement="bottomRight"
            >
              <Button type="text" icon={<MaterialIcon name="language" />} aria-label={t("language.switch")}>
                {locale === "zh-CN" ? "中文" : "EN"}
              </Button>
            </Dropdown>
            {session && (
              <Dropdown menu={{ items: userMenu }} placement="bottomRight">
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: "linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #3b82f6 100%)",
                    border: "1.5px solid rgba(255, 255, 255, 0.4)",
                    boxShadow: "0 2px 8px rgba(99, 102, 241, 0.25)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                    userSelect: "none",
                    marginLeft: 4,
                  }}
                  title={session.displayName}
                >
                  {(session.displayName || session.email || "U").trim().charAt(0).toUpperCase()}
                </div>
              </Dropdown>
            )}
          </div>
        </Header>

        <Content style={{ minHeight: 0, display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <Scrollbar className="shell-content-scrollbar" scrollX={false} style={{ height: "100%", width: "100%" }}>
            <div className="shell-content-inner" style={{ padding: "20px 24px 32px", minHeight: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", flex: 1 }}>
              <Outlet />
            </div>
          </Scrollbar>
        </Content>
      </Layout>
    </Layout>
  );
}
